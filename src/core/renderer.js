/* =====================================================================
 *  RENDER Y POSTPROCESADO — ACES, bloom suave, GTAO (alta), MSAA/SMAA.
 * ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* Limita el HDR antes del bloom: evita que valores enormes del cielo (o Inf/NaN en buffers de media
   precisión) se difuminen por toda la imagen como un velo blanco. */
const ClampShader = {
  name: 'ClampShader',
  uniforms: { tDiffuse: { value: null }, uMax: { value: 2000.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0); c.rgb = min(c.rgb, vec3(uMax)); gl_FragColor = c; }',
};

export function crearRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap; // r18x: PCF con radio de filtrado (PCFSoft obsoleto)
  return r;
}

export class Post {
  constructor(renderer, camera) {
    this.renderer = renderer; this.camera = camera;
    this.scene = new THREE.Scene();
    this.q = null; this.opts = {};
  }
  /** (Re)construye la cadena según la calidad. */
  construir(q) {
    this.q = q;
    if (this.composer) { this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose(); this.composer.passes.forEach((p) => p.dispose && p.dispose()); }
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    const size = r.getSize(new THREE.Vector2());
    const pr = r.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: q.msaa });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(size.x, size.y);
    this.render = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.render);
    this.gtao = null;
    if (q.ao) {
      this.gtao = new GTAOPass(this.scene, this.camera, size.x, size.y);
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.blendIntensity = 0.85;
      this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.2, thickness: 1.5, scale: 1.0, samples: 12 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      this.composer.addPass(this.gtao);
    }
    this.bloom = null;
    if (q.bloom) {
      this.composer.addPass(new ShaderPass(ClampShader));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.45, 0.92);
      // Filtro de brillo con "rodilla": solo florece el exceso sobre el umbral, y con tope,
      // para que el halo del cielo no vele toda la imagen.
      const hp = this.bloom.materialHighPassFilter;
      this.bloom.highPassUniforms.uMaxBloom = { value: 4 };
      hp.fragmentShader = `
        uniform sampler2D tDiffuse; uniform float luminosityThreshold; uniform float smoothWidth; uniform float uMaxBloom;
        varying vec2 vUv;
        void main() {
          vec3 c = min(texture2D(tDiffuse, vUv).rgb, vec3(uMaxBloom));
          float v = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float k = max(v - luminosityThreshold, 0.0) / max(v, 1e-4);
          gl_FragColor = vec4(c * k, 1.0);
        }`;
      hp.needsUpdate = true;
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    if (!q.msaa) this.composer.addPass(new SMAAPass());
    this.aplicarEscena();
  }
  setScene(scene, opts = {}) { this.scene = scene; this.opts = opts; this.aplicarEscena(); }
  aplicarEscena() {
    if (!this.composer) return;
    this.render.scene = this.scene;
    if (this.gtao) { this.gtao.scene = this.scene; this.gtao.enabled = this.opts.ao !== false; if (this.opts.aoRadio) this.gtao.updateGtaoMaterial({ radius: this.opts.aoRadio }); }
    const exp = this.scene.userData.exposicion ?? 1;
    // el umbral se compara antes de la exposición: se escala para que solo florezca lo que de verdad brilla en pantalla
    if (this.bloom) { this.bloom.strength = (this.opts.bloom ?? 0.28) * 1.4; this.bloom.threshold = ((this.opts.umbral ?? 0.92) * 2.2) / exp; this.bloom.highPassUniforms.uMaxBloom.value = 6 / exp; this.bloom.radius = this.opts.radioBloom ?? 0.45; }
    this.renderer.toneMappingExposure = exp;
  }
  setSize(w, h) {
    this.renderer.setSize(w, h, false);
    if (this.composer) { this.composer.setSize(w, h); if (this.gtao) this.gtao.setSize(w, h); }
  }
  dibujar() { this.composer.render(); }
}
