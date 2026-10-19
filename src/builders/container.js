/* =====================================================================
 *  CONTENEDOR 40' HIGH CUBE — geometría procedural detallada
 *  · Paredes de chapa corrugada reales (perfil trapezoidal)
 *  · Postes, cantoneras ISO, barras de cierre, bisagras, techo ondulado
 *  · Versión de bajo detalle (caja con normal map) para pilas instanciadas
 * ===================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as M from '../core/materials.js';
import * as TX from '../core/textures.js';

export const DIM = { L: 12.192, W: 2.438, H: 2.896 };
const POST = 0.16;

export const MARCAS = [
  { nombre: 'OCEANIS',  color: 0x1f4573, texto: '#f2f2ee' },
  { nombre: 'MAREVAL',  color: 0xc9592a, texto: '#f7f4ee' },
  { nombre: 'NORTRANS', color: 0x2d6a4c, texto: '#f2f2ee' },
  { nombre: 'KAIYO',    color: 0x8a3324, texto: '#f2f2ee' },
  { nombre: 'GRISLINE', color: 0x7f878f, texto: '#1b2026' },
  { nombre: 'TRITÓN',   color: 0xcfcabc, texto: '#1d3557' },
];

/* ---------- utilidades de geometría ---------- */
function norm(g) {
  const x = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k);
  if (!x.attributes.normal) x.computeVertexNormals();
  return x;
}
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return norm(g); }
function cyl(r, h, x, y, z, seg = 8) { const g = new THREE.CylinderGeometry(r, r, h, seg); g.translate(x, y, z); return norm(g); }

/** Panel corrugado en el plano XY (costillas a lo largo de X, extruido en Y, abomba hacia +Z). */
export function corrugated(len, hgt, { pitch = 0.278, depth = 0.036, outer = 0.072, inner = 0.07 } = {}) {
  const n = Math.max(1, Math.round(len / pitch));
  const p = len / n, s = p / pitch;
  const slope = (pitch - outer - inner) / 2;
  const d2 = depth / 2;
  const prof = [];
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * p;
    prof.push([x0, d2], [x0 + outer * s, d2], [x0 + (outer + slope) * s, -d2], [x0 + (outer + slope + inner) * s, -d2]);
  }
  prof.push([len / 2, d2]);
  const pos = [], nor = [], uv = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [xa, za] = prof[i], [xb, zb] = prof[i + 1];
    let nx = -(zb - za), nz = xb - xa; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const ua = (xa + len / 2) / len, ub = (xb + len / 2) / len;
    const quad = [[xa, 0, za, ua, 0], [xb, 0, zb, ub, 0], [xb, hgt, zb, ub, 1], [xa, 0, za, ua, 0], [xb, hgt, zb, ub, 1], [xa, hgt, za, ua, 1]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); nor.push(nx, 0, nz); uv.push(q[3], q[4]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/* ---------- geometrías detalladas (cacheadas) ---------- */
let DET = null;
function detalladas() {
  if (DET) return DET;
  const { L, W, H } = DIM;
  const paint = [], dark = [], metal = [], roof = [];
  const wallH = H - 0.32, wallY = 0.2;
  // Paredes laterales
  for (const side of [1, -1]) {
    const g = corrugated(L - 2 * POST, wallH);
    if (side < 0) g.rotateY(Math.PI);
    g.translate(0, wallY, side * (W / 2 - 0.022));
    paint.push(g);
  }
  // Testero frontal (x = -L/2)
  { const g = corrugated(W - 2 * POST, wallH, { pitch: 0.28 }); g.rotateY(-Math.PI / 2); g.translate(-L / 2 + 0.03, wallY, 0); paint.push(g); }
  // Postes de esquina
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) paint.push(box(POST, H - 0.24, POST, sx * (L / 2 - POST / 2), H / 2, sz * (W / 2 - POST / 2)));
  // Largueros superiores e inferiores
  for (const sz of [-1, 1]) {
    paint.push(box(L - 0.36, 0.11, 0.1, 0, H - 0.07, sz * (W / 2 - 0.05)));
    paint.push(box(L - 0.36, 0.2, 0.12, 0, 0.1, sz * (W / 2 - 0.06)));
  }
  // Travesaños de testeros
  for (const sx of [-1, 1]) {
    paint.push(box(0.12, 0.12, W - 0.36, sx * (L / 2 - 0.06), H - 0.08, 0));
    paint.push(box(0.14, 0.24, W - 0.36, sx * (L / 2 - 0.07), 0.12, 0));
  }
  // Cantoneras ISO (8)
  for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1])
    dark.push(box(0.178, 0.118, 0.162, sx * (L / 2 - 0.089), sy ? H - 0.059 : 0.059, sz * (W / 2 - 0.081)));
  // Suelo / bajos
  dark.push(box(L - 0.3, 0.12, W - 0.24, 0, 0.08, 0));
  for (let i = 0; i < 17; i++) dark.push(box(0.08, 0.1, W - 0.3, -L / 2 + 0.6 + i * 0.68, 0.05, 0));
  // Techo
  roof.push(box(L - 0.32, 0.03, W - 0.2, 0, H - 0.05, 0));
  DET = { paint: mergeGeometries(paint), dark: mergeGeometries(dark), roof: mergeGeometries(roof) };
  return DET;
}

/** Hoja de puerta (pivote en la bisagra, en el origen). side = +1 (z+) / -1 (z-). */
let DOOR = null;
function puertaGeoms() {
  if (DOOR) return DOOR;
  const { W, H } = DIM;
  const w = (W - 2 * POST) / 2 - 0.01, h = H - 0.36;
  const paint = [], metal = [];
  const panel = corrugated(w - 0.1, h - 0.2, { pitch: 0.3, depth: 0.018, outer: 0.09, inner: 0.09 });
  panel.translate(0, 0.1, 0); paint.push(panel);
  // marco de la hoja
  paint.push(box(w, 0.08, 0.05, 0, 0.04, 0), box(w, 0.08, 0.05, 0, h - 0.04, 0), box(0.06, h, 0.05, -w / 2 + 0.03, h / 2, 0), box(0.06, h, 0.05, w / 2 - 0.03, h / 2, 0));
  // barras de cierre (2 por hoja), guías y manillas
  for (const bx of [-w * 0.22, w * 0.25]) {
    metal.push(cyl(0.021, h + 0.12, bx, h / 2, 0.05));
    for (const by of [0.18, h - 0.18, h * 0.42]) metal.push(box(0.07, 0.05, 0.05, bx, by, 0.04));
    metal.push(box(0.04, 0.42, 0.03, bx + 0.06, h * 0.4, 0.09));
  }
  // bisagras
  for (const by of [0.3, h * 0.36, h * 0.64, h - 0.3]) metal.push(box(0.1, 0.09, 0.07, -w / 2 + 0.03, by, 0.03));
  DOOR = { paint: mergeGeometries(paint), metal: mergeGeometries(metal), w, h };
  return DOOR;
}

/* ---------- materiales de rótulos ---------- */
const decalMats = new Map();
function decalMat(tex) {
  if (!decalMats.has(tex)) decalMats.set(tex, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  return decalMats.get(tex);
}

/**
 * Contenedor protagonista con puertas animables.
 * @returns Group con userData.setPuertas(0..1)
 */
export function makeContainer({ color = 0x1f4573, marca = 'OCEANIS', codigo = 'OCNU 482913 6', textoColor = '#f2f2ee', sombras = true, precinto = true } = {}) {
  const { L, W, H } = DIM;
  const g = new THREE.Group(); g.name = 'contenedor';
  const det = detalladas();
  const paintM = M.contenedor(color);
  paintM.side = THREE.DoubleSide;
  const body = new THREE.Mesh(det.paint, paintM);
  const dark = new THREE.Mesh(det.dark, M.acero(0x2a2c2f, 0.7, 0.6));
  const roof = new THREE.Mesh(det.roof, M.techoOndulado(color));
  [body, dark, roof].forEach((m) => { m.castShadow = sombras; m.receiveShadow = true; g.add(m); });
  // interior oscuro (suelo de madera contrachapada)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.4, W - 0.2), M.madera('roble', 4, 1));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.15; floor.receiveShadow = true; g.add(floor);

  // Puertas
  const dg = puertaGeoms();
  const doors = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(L / 2 + 0.01, 0.18, side * (W / 2 - POST));
    const leaf = new THREE.Group();
    const lp = new THREE.Mesh(dg.paint, paintM); const lm = new THREE.Mesh(dg.metal, M.acero(0x9aa0a6, 0.35, 0.9));
    lp.castShadow = lm.castShadow = sombras;
    leaf.add(lp, lm);
    // hoja: en su espacio local, x = ancho; la rotamos para que mire a +X
    leaf.rotation.y = Math.PI / 2;
    leaf.position.z = -side * dg.w / 2;
    if (side < 0) { leaf.scale.x = -1; }
    pivot.add(leaf);
    g.add(pivot);
    doors.push({ pivot, side });
  }
  g.userData.setPuertas = (t) => { for (const d of doors) d.pivot.rotation.y = -d.side * t * 1.95; };

  // Rótulos
  const logo = TX.containerDecal(marca, codigo, textoColor);
  const code = TX.containerCode(codigo, textoColor);
  for (const side of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), decalMat(logo));
    p.position.set(-0.6 * side, H * 0.58, side * (W / 2 + 0.006));
    if (side < 0) p.rotation.y = Math.PI;
    g.add(p);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), decalMat(code));
    c.position.set(side > 0 ? L / 2 - 1.1 : -(L / 2 - 1.1), H - 0.42, side * (W / 2 + 0.006));
    if (side < 0) c.rotation.y = Math.PI;
    g.add(c);
  }
  // matrícula en la puerta derecha
  const cd = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), decalMat(code));
  cd.rotation.y = Math.PI / 2; cd.position.set(0.09, dg.h - 0.35, -dg.w * 0.45);
  doors[0].pivot.children[0].add(cd); cd.position.set(-dg.w * 0.05, dg.h - 0.35, 0.03); cd.rotation.set(0, 0, 0);

  // Precinto (para el hotspot): pequeño cilindro naranja en la manilla
  if (precinto) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 10), M.pintura(0xff7a1a, 0.4, 0.1));
    s.position.set(L / 2 + 0.12, 1.25, 0.32); s.rotation.x = Math.PI / 2;
    g.add(s); g.userData.precinto = s;
  }
  return g;
}

/* ---------- bajo detalle para pilas ---------- */
let LOW = null;
function bajas() {
  if (LOW) return LOW;
  const { L, W, H } = DIM;
  const main = new THREE.BoxGeometry(L - 0.06, H - 0.04, W - 0.05);
  main.translate(0, H / 2, 0);
  // uv1 escalado para que el normal map de costillas tenga el paso real
  const uv = main.attributes.uv, uv1 = new Float32Array(uv.count * 2);
  const spans = [W, W, L, L, L, L]; // +x,-x,+y,-y,+z,-z (u)
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v; const k = spans[f] / (0.278 * 8);
    uv1[i * 2] = uv.getX(i) * k; uv1[i * 2 + 1] = uv.getY(i);
  }
  main.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  const parts = [norm1(main)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(norm1(boxU(POST, H - 0.2, POST, sx * (L / 2 - POST / 2), H / 2, sz * (W / 2 - POST / 2))));
  for (const sz of [-1, 1]) { parts.push(norm1(boxU(L - 0.3, 0.11, 0.08, 0, H - 0.07, sz * (W / 2 - 0.03)))); parts.push(norm1(boxU(L - 0.3, 0.2, 0.08, 0, 0.1, sz * (W / 2 - 0.03)))); }
  // barras de puerta sugeridas
  for (const bz of [-0.85, -0.3, 0.3, 0.85]) parts.push(norm1(boxU(0.05, H - 0.4, 0.05, L / 2 - 0.01, H / 2, bz)));
  const dark = [];
  for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) dark.push(box(0.18, 0.12, 0.165, sx * (L / 2 - 0.089), sy ? H - 0.059 : 0.059, sz * (W / 2 - 0.081)));
  LOW = { paint: mergeGeometries(parts), dark: mergeGeometries(dark) };
  return LOW;
}
function boxU(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); g.setAttribute('uv1', g.attributes.uv.clone()); return g; }
function norm1(g) { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'uv1'].includes(k)) x.deleteAttribute(k); return x; }

let lowMat = null;
function materialBajo() {
  if (lowMat) return lowMat;
  const gr = TX.containerGrime();
  const n = TX.ribsNormal(8, 3).clone(); n.channel = 1; n.needsUpdate = true;
  lowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gr.map, roughnessMap: gr.roughnessMap, normalMap: n, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 1, metalness: 0.35 });
  return lowMat;
}

let decalGeo = null;
function decalGeoLados() {
  if (decalGeo) return decalGeo;
  const { W, H } = DIM;
  const a = new THREE.PlaneGeometry(5.2, 1.3); a.translate(-0.6, H * 0.58, W / 2 + 0.02);
  const b = new THREE.PlaneGeometry(5.2, 1.3); b.rotateY(Math.PI); b.translate(0.6, H * 0.58, -W / 2 - 0.02);
  decalGeo = mergeGeometries([a, b]);
  return decalGeo;
}

/**
 * Patio / pila de contenedores instanciados (bajo detalle).
 * slots: [{ x, y, z, ry, marca(índice), tono(0..1) }]
 */
export function makeYard(slots, { sombras = true, rotulos = true } = {}) {
  const grp = new THREE.Group(); grp.name = 'patio';
  if (!slots.length) return grp;
  const low = bajas();
  const n = slots.length;
  const paint = new THREE.InstancedMesh(low.paint, materialBajo(), n);
  const dark = new THREE.InstancedMesh(low.dark, M.acero(0x26282b, 0.7, 0.6), n);
  paint.castShadow = sombras; paint.receiveShadow = true; dark.castShadow = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const col = new THREE.Color(), hsl = {};
  const porMarca = MARCAS.map(() => []);
  slots.forEach((sl, i) => {
    e.set(0, sl.ry || 0, 0); q.setFromEuler(e); p.set(sl.x, sl.y, sl.z);
    m4.compose(p, q, s);
    paint.setMatrixAt(i, m4); dark.setMatrixAt(i, m4);
    const mk = MARCAS[sl.marca % MARCAS.length];
    col.setHex(mk.color); col.getHSL(hsl);
    col.setHSL(hsl.h, hsl.s * (0.85 + (sl.tono ?? 0.5) * 0.25), hsl.l * (0.82 + (sl.tono ?? 0.5) * 0.3));
    paint.setColorAt(i, col);
    porMarca[sl.marca % MARCAS.length].push(m4.clone());
  });
  paint.instanceMatrix.needsUpdate = true; dark.instanceMatrix.needsUpdate = true;
  if (paint.instanceColor) paint.instanceColor.needsUpdate = true;
  paint.computeBoundingSphere(); dark.computeBoundingSphere();
  grp.add(paint, dark);
  if (rotulos) {
    porMarca.forEach((mats, mi) => {
      if (!mats.length) return;
      const mk = MARCAS[mi];
      const im = new THREE.InstancedMesh(decalGeoLados(), decalMat(TX.containerDecal(mk.nombre, '', mk.texto)), mats.length);
      mats.forEach((mm, j) => im.setMatrixAt(j, mm));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      grp.add(im);
    });
  }
  grp.userData.count = n;
  return grp;
}

/** Genera huecos en cuadrícula para una pila: filas (z) × bahías (x) × alturas. */
export function slotsPila({ x0 = 0, z0 = 0, bahias = 6, filas = 4, alturaMax = 4, gapX = 0.4, gapZ = 0.35, ry = 0, densidad = 1, seed = 1, marcas = null } = {}) {
  const out = [];
  let r = seed * 9301 + 49297;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let b = 0; b < bahias; b++) for (let f = 0; f < filas; f++) {
    const h = Math.max(1, Math.round((0.35 + rnd() * 0.65) * alturaMax * Math.min(1, densidad + 0.2)));
    for (let k = 0; k < h; k++) {
      if (rnd() > densidad + 0.15) break;
      const lx = b * (DIM.L + gapX), lz = f * (DIM.W + gapZ);
      const c = Math.cos(ry), s = Math.sin(ry);
      out.push({ x: x0 + lx * c + lz * s, y: k * DIM.H, z: z0 - lx * s + lz * c, ry, marca: marcas ? marcas[Math.floor(rnd() * marcas.length)] : Math.floor(rnd() * MARCAS.length), tono: rnd() });
    }
  }
  return out;
}
