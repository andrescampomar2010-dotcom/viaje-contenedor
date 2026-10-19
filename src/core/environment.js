/* =====================================================================
 *  ENTORNO E ILUMINACIÓN — cielo físico (Sky), mapa de entorno PMREM,
 *  sol con sombras suaves, luz hemisférica y niebla. Hora por escena.
 * ===================================================================== */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let pmrem = null;
function getPMREM(renderer) { if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer); return pmrem; }

/** Dirección del sol a partir de elevación y azimut (grados). */
export function dirSol(elev, azim) {
  const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(azim);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

function configSky(sky, o, sun) {
  const u = sky.material.uniforms;
  u.turbidity.value = o.turbidez ?? 4;
  u.rayleigh.value = o.rayleigh ?? 1.5;
  u.mieCoefficient.value = o.mie ?? 0.005;
  u.mieDirectionalG.value = o.mieG ?? 0.8;
  u.sunPosition.value.copy(sun);
  if (u.cloudCoverage) {
    u.cloudCoverage.value = o.nubes ?? 0.35;
    u.cloudDensity.value = o.densidadNubes ?? 0.4;
    u.cloudScale.value = o.escalaNubes ?? 0.0002;
    u.cloudElevation.value = o.alturaNubes ?? 0.5;
  }
}

/**
 * Cielo exterior completo.
 * o: { elev, azim, turbidez, rayleigh, mie, mieG, nubes, exposicion, colorSol, intensidadSol,
 *      cieloHemi, sueloHemi, intensidadHemi, niebla:{color, densidad}, sombra:{centro, radio, lejos},
 *      intensidadEntorno }
 */
export function cieloExterior(scene, renderer, q, o) {
  const sun = dirSol(o.elev, o.azim);
  const sky = new Sky(); sky.scale.setScalar(9000); sky.name = 'cielo';
  configSky(sky, o, sun);
  scene.add(sky);

  // Mapa de entorno a partir del propio cielo
  const envScene = new THREE.Scene();
  const sky2 = new Sky(); sky2.scale.setScalar(9000); configSky(sky2, o, sun);
  if (sky2.material.uniforms.cloudCoverage) sky2.material.uniforms.cloudCoverage.value = (o.nubes ?? 0.35) * 0.6;
  envScene.add(sky2);
  // suelo neutro para que el entorno no ilumine desde abajo como cielo
  const g = new THREE.Mesh(new THREE.CircleGeometry(4000, 16), new THREE.MeshBasicMaterial({ color: o.colorSueloEntorno ?? 0x3a3c3e }));
  g.rotation.x = -Math.PI / 2; g.position.y = -20; envScene.add(g);
  const rt = getPMREM(renderer).fromScene(envScene, 0.02, 1, 10000);
  scene.environment = rt.texture;
  scene.environmentIntensity = o.intensidadEntorno ?? 0.6;
  sky2.material.dispose(); sky2.geometry.dispose();

  // Sol
  const luz = new THREE.DirectionalLight(o.colorSol ?? 0xfff1e0, o.intensidadSol ?? 3);
  const centro = o.sombra?.centro ?? new THREE.Vector3();
  const radio = o.sombra?.radio ?? 60;
  luz.position.copy(sun).multiplyScalar(radio * 2.5).add(centro);
  luz.target.position.copy(centro);
  luz.castShadow = q.sombras;
  luz.shadow.mapSize.set(q.shadowMap, q.shadowMap);
  const cam = luz.shadow.camera;
  cam.left = -radio; cam.right = radio; cam.top = radio; cam.bottom = -radio; cam.near = 1; cam.far = radio * 6;
  luz.shadow.bias = o.sombra?.bias ?? -0.0004;
  luz.shadow.normalBias = o.sombra?.normalBias ?? 0.04;
  luz.shadow.radius = 3;
  scene.add(luz, luz.target);

  const hemi = new THREE.HemisphereLight(o.cieloHemi ?? 0xbcd2ee, o.sueloHemi ?? 0x6b5a48, o.intensidadHemi ?? 0.35);
  scene.add(hemi);

  if (o.niebla) scene.fog = new THREE.FogExp2(o.niebla.color, o.niebla.densidad);
  scene.userData.exposicion = o.exposicion ?? 0.55;

  return {
    sky, sol: luz, hemi, sunDir: sun,
    update(t) { if (sky.material.uniforms.time) sky.material.uniforms.time.value = t; },
    setCalidad(qq) { luz.castShadow = qq.sombras; if (luz.shadow.map) { luz.shadow.map.dispose(); luz.shadow.map = null; } luz.shadow.mapSize.set(qq.shadowMap, qq.shadowMap); },
  };
}

/** Entorno interior (estudio) para oficinas. */
export function entornoInterior(scene, renderer, { intensidad = 0.5, fondo = 0x0d1117 } = {}) {
  const env = new RoomEnvironment();
  const rt = getPMREM(renderer).fromScene(env, 0.04);
  scene.environment = rt.texture;
  scene.environmentIntensity = intensidad;
  scene.background = new THREE.Color(fondo);
  env.dispose?.();
  return rt.texture;
}

/** Luz direccional genérica con sombra. */
export function luzSombra(scene, q, { color = 0xffffff, intensidad = 2, pos, objetivo = new THREE.Vector3(), radio = 10, bias = -0.0003 }) {
  const l = new THREE.DirectionalLight(color, intensidad);
  l.position.copy(pos); l.target.position.copy(objetivo);
  l.castShadow = q.sombras; l.shadow.mapSize.set(q.shadowMap, q.shadowMap);
  const c = l.shadow.camera; c.left = -radio; c.right = radio; c.top = radio; c.bottom = -radio; c.near = 0.5; c.far = pos.distanceTo(objetivo) + radio * 2;
  l.shadow.bias = bias; l.shadow.normalBias = 0.02; l.shadow.radius = 4;
  scene.add(l, l.target);
  return l;
}

/** Domo de bruma: funde el horizonte del cielo con el color de la niebla. */
export function domoBruma(scene, { color = 0xbfc8d2, altura = 0.18, opacidad = 1, radio = 4200 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAltura: { value: altura }, uOp: { value: opacidad } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uAltura, uOp; varying vec3 vDir; void main(){ float a = 1.0 - smoothstep(-0.02, uAltura, vDir.y); gl_FragColor = vec4(uColor, a * uOp); }',
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const d = new THREE.Mesh(new THREE.SphereGeometry(radio, 48, 24), m);
  d.renderOrder = -1; d.frustumCulled = false; d.name = 'bruma';
  d.onBeforeRender = (r, sc, cam) => d.position.copy(cam.position);
  scene.add(d);
  return d;
}
