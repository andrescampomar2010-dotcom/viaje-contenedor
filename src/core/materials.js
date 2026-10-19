/* =====================================================================
 *  MATERIALES PBR COMPARTIDOS — se crean una vez y se reutilizan.
 * ===================================================================== */
import * as THREE from 'three';
import * as TX from './textures.js';

const lib = new Map();
function get(key, fn) { if (!lib.has(key)) lib.set(key, fn()); return lib.get(key); }

export const COLORES = {
  marino: 0x12233d, naranja: 0xd9622b, gris: 0x7b8591, rojoOxido: 0x8e3424,
  verde: 0x2f6b4f, azul: 0x2a5d8f, blanco: 0xe9e9e4, amarillo: 0xe2a619, granate: 0x6c1f2a,
};

/** Pintura de contenedor con desgaste (color multiplicado por textura de suciedad). */
export function contenedor(color = 0xffffff) {
  return get('cont' + color, () => {
    const g = TX.containerGrime();
    return new THREE.MeshStandardMaterial({ color, map: g.map, roughnessMap: g.roughnessMap, roughness: 1, metalness: 0.35, envMapIntensity: 0.9 });
  });
}
/** Igual pero sin color fijo: para InstancedMesh con instanceColor. */
export function contenedorInstanciado() {
  return get('contInst', () => {
    const g = TX.containerGrime();
    return new THREE.MeshStandardMaterial({ color: 0xffffff, map: g.map, roughnessMap: g.roughnessMap, roughness: 1, metalness: 0.35 });
  });
}
export function techoOndulado(color = 0xffffff) {
  return get('roof' + color, () => {
    const g = TX.containerGrime();
    const n = TX.ribsNormal(10, 3).clone(); n.repeat.set(6, 1); n.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color, map: g.map, roughnessMap: g.roughnessMap, normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, metalness: 0.35 });
  });
}
export const acero = (color = 0x5d636b, rough = 0.55, metal = 0.85) => get(`acero${color}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
export const pintura = (color, rough = 0.5, metal = 0.25) => get(`pint${color}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
export const goma = () => get('goma', () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92, metalness: 0 }));
export const cromo = () => get('cromo', () => new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.15, metalness: 1 }));
export const cristal = (tint = 0x9fb6c8, op = 0.35) => get('cristal' + tint + op, () => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: op, envMapIntensity: 1.5, depthWrite: false }));
export const cristalOscuro = () => get('cristalOsc', () => new THREE.MeshStandardMaterial({ color: 0x0c141c, roughness: 0.08, metalness: 0.9, envMapIntensity: 1.4 }));
export const emisivo = (color, intensidad = 2) => get(`emis${color}${intensidad}`, () => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensidad, roughness: 0.4 }));
export const basico = (color) => get('bas' + color, () => new THREE.MeshBasicMaterial({ color }));

/** Variación de color a gran escala (rompe la repetición de texturas en suelos). */
export function variacionMacro(m, escala = 0.02, fuerza = 0.25) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMacroEsc = { value: escala }; sh.uniforms.uMacroF = { value: fuerza };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMacro;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMacro = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vMacro; uniform float uMacroEsc, uMacroF;
      float mh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float mn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mh(i), mh(i + vec2(1, 0)), f.x), mix(mh(i + vec2(0, 1)), mh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      { vec2 q = vMacro * uMacroEsc; float n = mn(q) * 0.55 + mn(q * 2.7) * 0.3 + mn(q * 7.3) * 0.15; diffuseColor.rgb *= 1.0 - uMacroF * 0.5 + uMacroF * n; }`);
  };
  m.customProgramCacheKey = () => 'macro' + escala + fuerza;
  return m;
}

export function hormigon(rep = 8) {
  return get('horm' + rep, () => {
    const t = TX.concrete();
    const m = new THREE.MeshStandardMaterial({ map: t.map.clone(), roughnessMap: t.roughnessMap.clone(), normalMap: t.normalMap.clone(), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 1, metalness: 0 });
    [m.map, m.roughnessMap, m.normalMap].forEach((x) => { x.repeat.set(rep, rep); x.needsUpdate = true; });
    return variacionMacro(m, 0.035, 0.35);
  });
}
export function asfalto(rx = 8, ry = 8) {
  return get(`asf${rx}${ry}`, () => {
    const t = TX.asphalt();
    const m = new THREE.MeshStandardMaterial({ map: t.map.clone(), normalMap: t.normalMap.clone(), roughness: 0.9, metalness: 0, normalScale: new THREE.Vector2(0.6, 0.6) });
    [m.map, m.normalMap].forEach((x) => { x.repeat.set(rx, ry); x.needsUpdate = true; });
    return variacionMacro(m, 0.05, 0.3);
  });
}
export function madera(kind = 'roble', rx = 1, ry = 1) {
  return get(`mad${kind}${rx}${ry}`, () => {
    const t = TX.wood(kind);
    const m = new THREE.MeshStandardMaterial({ map: t.map.clone(), normalMap: t.normalMap.clone(), roughnessMap: t.roughnessMap.clone(), roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.4, 0.4) });
    [m.map, m.normalMap, m.roughnessMap].forEach((x) => { x.repeat.set(rx, ry); x.needsUpdate = true; });
    return m;
  });
}
export function chapaOndulada(color, rx = 8, ry = 1) {
  return get(`chapa${color}${rx}${ry}`, () => {
    const n = TX.ribsNormal(8, 3).clone(); n.repeat.set(rx, ry); n.needsUpdate = true;
    const g = TX.containerGrime(0);
    const map = g.map.clone(); map.repeat.set(rx / 6, ry); map.needsUpdate = true;
    const rm = g.roughnessMap.clone(); rm.repeat.set(rx / 6, ry); rm.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color, normalMap: n, normalScale: new THREE.Vector2(1, 1), map, roughnessMap: rm, roughness: 0.75, metalness: 0.45 });
  });
}
export function franjas(rep = 4) {
  return get('franjas' + rep, () => { const t = TX.hazard().clone(); t.repeat.set(rep, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.2 }); });
}
export function carton() {
  return get('carton', () => new THREE.MeshStandardMaterial({ map: TX.cardboard(), roughness: 0.85, metalness: 0 }));
}
