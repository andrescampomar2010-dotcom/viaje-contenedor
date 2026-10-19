/* =====================================================================
 *  EFECTOS — partículas (humo, polvo, espuma), estela del buque y mar.
 * ===================================================================== */
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import * as TX from './textures.js';

/* ---------- Emisor de partículas con fade y crecimiento ---------- */
const vert = /* glsl */`
  attribute float aSize; attribute float aAlpha; attribute float aRot;
  varying float vAlpha; varying float vRot;
  uniform float uScale;
  #include <fog_pars_vertex>
  void main(){
    vAlpha = aAlpha; vRot = aRot;
    vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const frag = /* glsl */`
  uniform sampler2D map; uniform vec3 color;
  varying float vAlpha; varying float vRot;
  #include <fog_pars_fragment>
  void main(){
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    p = mat2(c,-s,s,c) * p + 0.5;
    vec4 t = texture2D(map, p);
    gl_FragColor = vec4(color, t.a * vAlpha);
    if (gl_FragColor.a < 0.004) discard;
    #include <fog_fragment>
  }`;

export class Emisor {
  /**
   * o: { max, origen(Object3D|Vector3), tasa(part/s), vida, vel(Vector3), dispersion, tamIni, tamFin,
   *      alfa, color, viento(Vector3), aditivo, gravedad }
   */
  constructor(o) {
    this.o = Object.assign({ max: 200, tasa: 20, vida: 4, vel: new THREE.Vector3(0, 2, 0), dispersion: 0.6, tamIni: 1, tamFin: 4, alfa: 0.5, color: 0xcccccc, viento: new THREE.Vector3(1, 0, 0), aditivo: false, gravedad: 0 }, o);
    const n = this.o.max;
    this.pos = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n); this.rot = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.age = new Float32Array(n).fill(1e9); this.life = new Float32Array(n); this.spin = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: TX.smokeSprite() }, color: { value: new THREE.Color(this.o.color) }, uScale: { value: 400 } }]),
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, fog: true,
      blending: this.o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.acc = 0; this.next = 0;
    this._v = new THREE.Vector3();
  }
  setEscala(alturaPx, fov) { this.mat.uniforms.uScale.value = alturaPx / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)); }
  origenMundo(out) {
    const o = this.o.origen;
    if (o && o.isObject3D) o.getWorldPosition(out); else if (o) out.copy(o); else out.set(0, 0, 0);
    return out;
  }
  update(dt) {
    const o = this.o, n = o.max;
    this.acc += dt * o.tasa;
    const org = this.origenMundo(this._v);
    if (o.origenAleatorio) { /* sobreescrito por el usuario */ }
    while (this.acc >= 1) {
      this.acc -= 1;
      const i = this.next; this.next = (this.next + 1) % n;
      let ox = org.x, oy = org.y, oz = org.z;
      if (o.caja) { ox += (Math.random() - 0.5) * o.caja.x; oy += (Math.random() - 0.5) * o.caja.y; oz += (Math.random() - 0.5) * o.caja.z; }
      this.pos[i * 3] = ox; this.pos[i * 3 + 1] = oy; this.pos[i * 3 + 2] = oz;
      const d = o.dispersion;
      this.vel[i * 3] = o.vel.x + (Math.random() - 0.5) * d; this.vel[i * 3 + 1] = o.vel.y + (Math.random() - 0.5) * d; this.vel[i * 3 + 2] = o.vel.z + (Math.random() - 0.5) * d;
      this.age[i] = 0; this.life[i] = o.vida * (0.7 + Math.random() * 0.6); this.rot[i] = Math.random() * 6.28; this.spin[i] = (Math.random() - 0.5) * 0.6;
    }
    for (let i = 0; i < n; i++) {
      if (this.age[i] > this.life[i]) { this.alpha[i] = 0; continue; }
      this.age[i] += dt;
      const k = this.age[i] / this.life[i];
      this.vel[i * 3] += o.viento.x * dt; this.vel[i * 3 + 1] += (o.viento.y - o.gravedad) * dt; this.vel[i * 3 + 2] += o.viento.z * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = o.tamIni + (o.tamFin - o.tamIni) * Math.sqrt(k);
      this.alpha[i] = o.alfa * Math.min(1, k * 6) * (1 - k) * (1 - k);
      this.rot[i] += this.spin[i] * dt;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; g.attributes.aRot.needsUpdate = true;
  }
  /** Precalienta la simulación para que no arranque vacía. */
  precalentar(seg = 5, paso = 1 / 20) { for (let t = 0; t < seg; t += paso) this.update(paso); }
}

/* ---------- Polvo flotante (rayo de luz en la oficina) ---------- */
export function polvo({ n = 300, caja = new THREE.Vector3(3, 2, 3), centro = new THREE.Vector3(), color = 0xfff2d8, tam = 0.02 } = {}) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { base[i * 3] = (Math.random() - 0.5) * caja.x; base[i * 3 + 1] = (Math.random() - 0.5) * caja.y; base[i * 3 + 2] = (Math.random() - 0.5) * caja.z; }
  p.set(base);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color, size: tam, map: TX.smokeSprite(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.position.copy(centro);
  pts.userData.update = (t) => {
    for (let i = 0; i < n; i++) {
      p[i * 3] = base[i * 3] + Math.sin(t * 0.13 + i) * 0.08;
      p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + i * 1.7) * 0.06;
      p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + i * 0.7) * 0.08;
    }
    g.attributes.position.needsUpdate = true;
  };
  return pts;
}

/* ---------- Mar con shader de reflejos (three/addons Water) ---------- */
export function mar({ tam = 6000, q, sunDir, colorAgua = 0x0e3a52, colorSol = 0xffffff, distorsion = 3.2, niebla = true }) {
  const normales = TX.waterNormals();
  const w = new Water(new THREE.PlaneGeometry(tam, tam, 1, 1), {
    textureWidth: q.agua, textureHeight: q.agua, waterNormals: normales,
    sunDirection: sunDir.clone().normalize(), sunColor: colorSol, waterColor: colorAgua,
    distortionScale: distorsion, fog: niebla, alpha: 1,
  });
  w.rotation.x = -Math.PI / 2;
  w.material.uniforms.size.value = 1.4;
  w.name = 'mar';
  w.userData.update = (t, vel = 1) => { w.material.uniforms.time.value = t * 0.35 * vel; };
  return w;
}

/* ---------- Estela: banda de espuma procedural ---------- */
export function estela({ largo = 260, ancho = 34, x0 = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(largo, ancho, 120, 12);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x0 - largo / 2, 0.08, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uLargo: { value: largo }, uX0: { value: x0 }, uAncho: { value: ancho } }]),
    transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLargo, uX0, uAncho; varying vec3 vW; varying vec2 vUv;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){
        float d = (uX0 - vW.x) / uLargo;            // 0 en popa → 1 lejos
        float spread = mix(0.25, 1.0, sqrt(clamp(d,0.,1.)));
        float z = abs(vW.z) / (uAncho * 0.5);
        float core = smoothstep(spread, spread*0.25, z);
        float edge = smoothstep(spread*0.55, spread*0.95, z) * smoothstep(spread*1.05, spread*0.9, z);
        vec2 p = vec2(vW.x + uTime * 9.0, vW.z) * 0.12;
        float f = fbm(p) * 0.7 + fbm(p * 3.1 + uTime * 0.3) * 0.5;
        float foam = (core * smoothstep(0.35, 0.8, f) + edge * smoothstep(0.45, 0.75, f) * 0.8);
        foam *= (1. - smoothstep(0.55, 1.0, d)) * smoothstep(0.0, 0.03, d);
        gl_FragColor = vec4(vec3(0.93,0.96,0.97), foam * 0.85);
        #include <fog_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 2; m.name = 'estela';
  m.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return m;
}
