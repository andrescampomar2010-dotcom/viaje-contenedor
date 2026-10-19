/* =====================================================================
 *  VEHÍCULOS — cabeza tractora + chasis portacontenedores, carretilla
 *  elevadora y palés. Geometría procedural, materiales PBR compartidos.
 * ===================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as M from '../core/materials.js';
import { DIM, makeContainer } from './container.js';

/* ---------- Rueda (neumático por torno + llanta) ---------- */
let WHEEL = null;
function wheelGeoms() {
  if (WHEEL) return WHEEL;
  const R = 0.52, w = 0.31;
  const pts = [];
  // perfil del neumático (radio, y) con hombros redondeados
  const prof = [[0.33, -w / 2], [0.42, -w / 2], [R - 0.05, -w / 2 + 0.01], [R - 0.01, -w / 2 + 0.05], [R, -w / 2 + 0.1], [R, w / 2 - 0.1], [R - 0.01, w / 2 - 0.05], [R - 0.05, w / 2 - 0.01], [0.42, w / 2], [0.33, w / 2]];
  prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const tire = new THREE.LatheGeometry(pts, 28);
  tire.rotateZ(Math.PI / 2); // eje en X local → lo giraremos según el vehículo
  const rimParts = [];
  const disc = new THREE.CylinderGeometry(0.34, 0.34, w * 0.8, 24, 1); disc.rotateZ(Math.PI / 2); rimParts.push(disc);
  const hub = new THREE.CylinderGeometry(0.12, 0.14, w * 0.95, 12); hub.rotateZ(Math.PI / 2); rimParts.push(hub);
  for (let i = 0; i < 10; i++) { // tuercas
    const a = (i / 10) * Math.PI * 2; const n = new THREE.CylinderGeometry(0.018, 0.018, w, 6); n.rotateZ(Math.PI / 2); n.translate(0, Math.cos(a) * 0.19, Math.sin(a) * 0.19); rimParts.push(n);
  }
  WHEEL = { tire, rim: mergeGeometries(rimParts.map((g) => g.index ? g.toNonIndexed() : g)), R };
  return WHEEL;
}
function rueda(x, y, z, dual = false) {
  const g = new THREE.Group();
  const wg = wheelGeoms();
  const offs = dual ? [-0.17, 0.17] : [0];
  for (const o of offs) {
    const t = new THREE.Mesh(wg.tire, M.goma()); t.position.x = o; t.castShadow = true;
    const r = new THREE.Mesh(wg.rim, M.acero(0xb9bdc1, 0.35, 0.9)); r.position.x = o;
    g.add(t, r);
  }
  g.rotation.y = Math.PI / 2; // eje a lo largo de Z del vehículo
  g.position.set(x, y, z);
  return g;
}

/* ---------- Camión ---------- */
const pinturaCamion = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.12 });
const pintCache = new Map();
function pintCam(c) { if (!pintCache.has(c)) pintCache.set(c, pinturaCamion(c)); return pintCache.get(c); }

/**
 * Cabeza tractora + chasis de 40'. Eje X = adelante. Origen en el suelo, centro del conjunto.
 * opts: { color, contenedor: bool | Group, marca, colorCont, nombre }
 */
export function makeTruck({ color = 0xf1f1ee, franja = 0x1d3f6e, contenedor = true, colorCont = 0x1f4573, marca = 'OCEANIS', codigo = 'OCNU 482913 6', rotulo = null } = {}) {
  const root = new THREE.Group(); root.name = 'camion';
  const wheels = [];
  const paint = pintCam(color);
  const dark = M.acero(0x1d1f22, 0.6, 0.5);
  const trailerLen = 12.6;
  const tx = trailerLen / 2 + 1.6; // posición de la tractora (centro)

  // --- Tractora ---
  const tr = new THREE.Group(); tr.position.x = tx; root.add(tr);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(2.25, 2.45, 2.48, 3, 0.14), paint);
  cab.position.set(1.65, 2.55, 0); cab.castShadow = true; tr.add(cab);
  // franja lateral
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.22), M.pintura(franja, 0.4, 0.3));
    f.position.set(1.6, 2.0, s * 1.245); if (s < 0) f.rotation.y = Math.PI; tr.add(f);
  }
  // parabrisas (inclinado) y ventanillas
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.05), M.cristalOscuro());
  ws.position.set(2.785, 2.95, 0); ws.rotation.y = Math.PI / 2; ws.rotation.x = 0; tr.add(ws);
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.75), M.cristalOscuro());
    w.position.set(2.3, 3.0, s * 1.248); if (s < 0) w.rotation.y = Math.PI; tr.add(w);
  }
  // rejilla, paragolpes, faros
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.7), dark); grill.position.set(2.79, 1.85, 0); tr.add(grill);
  for (let i = 0; i < 6; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 1.6), M.cromo()); sl.position.set(2.8, 1.5 + i * 0.13, 0); tr.add(sl); }
  const bump = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.45, 2.45, 2, 0.06), dark); bump.position.set(2.72, 1.0, 0); tr.add(bump);
  const faroM = new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xfff3d6, emissiveIntensity: 0, roughness: 0.2, metalness: 0.3 });
  for (const s of [1, -1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.42), faroM); h.position.set(2.86, 1.12, s * 0.88); tr.add(h); }
  // visera y deflector
  const vis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.3), dark); vis.position.set(2.75, 3.62, 0); vis.rotation.z = -0.15; tr.add(vis);
  const spoil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.3), paint); spoil.position.set(1.4, 3.95, 0); spoil.rotation.z = 0.22; spoil.castShadow = true; tr.add(spoil);
  // retrovisores
  for (const s of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), dark); arm.position.set(2.75, 3.1, s * 1.42); tr.add(arm);
    const mir = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.6, 0.24, 2, 0.03), dark); mir.position.set(2.75, 3.0, s * 1.62); tr.add(mir);
  }
  // chasis, depósito, escape, quinta rueda
  for (const s of [1, -1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.28, 0.1), dark); rail.position.set(-0.4, 0.95, s * 0.42); tr.add(rail); }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 20), M.acero(0xc9ccd0, 0.25, 0.95)); tank.rotation.z = Math.PI / 2; tank.position.set(0.0, 0.85, 0.95); tank.castShadow = true; tr.add(tank);
  const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.45), dark); box2.position.set(0.1, 0.85, -0.95); tr.add(box2);
  const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12), M.cromo()); exh.position.set(0.42, 2.6, -1.05); tr.add(exh);
  const exhaust = new THREE.Object3D(); exhaust.position.set(0.42, 3.75, -1.05); tr.add(exhaust);
  const fifth = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 20), dark); fifth.position.set(-1.6, 1.2, 0); tr.add(fifth);
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), dark); step.position.set(1.9, 0.75, 0); tr.add(step);
  // guardabarros
  for (const s of [1, -1]) { const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.4, 16, 1, true, 0, Math.PI), dark); mg.rotation.x = Math.PI / 2; mg.rotation.z = Math.PI / 2; mg.position.set(1.65, 0.55, s * 1.05); tr.add(mg); }
  // ruedas tractora
  const R = wheelGeoms().R;
  for (const s of [1, -1]) {
    const w1 = rueda(1.65, R, s * 1.02); tr.add(w1); wheels.push(w1);
    for (const ax of [-1.7, -3.05]) { const w = rueda(ax, R, s * 0.86, true); tr.add(w); wheels.push(w); }
  }
  if (rotulo) {
    for (const s of [1, -1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshStandardMaterial({ map: rotulo, transparent: true, roughness: 0.5 }));
      p.position.set(1.55, 2.5, s * 1.25); if (s < 0) p.rotation.y = Math.PI; tr.add(p);
    }
  }

  // --- Chasis portacontenedores ---
  const tl = new THREE.Group(); root.add(tl);
  for (const s of [1, -1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(trailerLen, 0.32, 0.14), dark); r.position.set(0, 1.12, s * 0.5); r.castShadow = true; tl.add(r); }
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 2.44), dark); c.position.set(-trailerLen / 2 + 0.3 + i * (trailerLen - 0.6) / 8, 1.24, 0); tl.add(c); }
  // patas de apoyo
  for (const s of [1, -1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), dark); l.position.set(3.2, 0.6, s * 0.6); tl.add(l); }
  // luces traseras y paragolpes
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 2.44), dark); rearBar.position.set(-trailerLen / 2 - 0.05, 0.75, 0); tl.add(rearBar);
  const pilotoM = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1a0a, emissiveIntensity: 0.6, roughness: 0.3 });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.4), pilotoM); p.position.set(-trailerLen / 2 - 0.12, 0.8, s * 0.9); tl.add(p); }
  for (const ax of [-4.4, -5.7]) for (const s of [1, -1]) { const w = rueda(ax, R, s * 0.86, true); tl.add(w); wheels.push(w); }
  for (const s of [1, -1]) { const mg = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.7), dark); mg.position.set(-5.05, 1.12, s * 0.9); tl.add(mg); }

  let cont = null;
  if (contenedor) {
    cont = contenedor.isObject3D ? contenedor : makeContainer({ color: colorCont, marca, codigo, precinto: false });
    cont.position.set(0, 1.32, 0);
    cont.rotation.y = Math.PI; // puertas hacia la trasera
    tl.add(cont);
  }

  root.userData = {
    wheels, exhaust, faroM, pilotoM, contenedor: cont,
    rodar(dist) { for (const w of wheels) w.children.forEach((c) => { c.rotation.x -= dist / R; }); },
  };
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
  [cab, spoil, tank].forEach((m) => (m.castShadow = true));
  wheels.forEach((w) => w.traverse((o) => { if (o.isMesh) o.castShadow = true; }));
  return root;
}

/* ---------- Carretilla elevadora ---------- */
export function makeForklift({ color = 0xe0a21a } = {}) {
  const root = new THREE.Group(); root.name = 'carretilla';
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const dark = M.acero(0x202226, 0.6, 0.5);
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.9, 1.15, 3, 0.1), paint); body.position.set(-0.2, 0.75, 0); body.castShadow = true; root.add(body);
  const cw = new THREE.Mesh(new RoundedBoxGeometry(0.6, 1.0, 1.15, 3, 0.18), M.pintura(0x2b2d31, 0.6, 0.4)); cw.position.set(-1.0, 0.95, 0); cw.castShadow = true; root.add(cw);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.1), M.pintura(0x111111, 0.8, 0)); seat.position.set(-0.45, 1.45, 0); root.add(seat);
  const steer = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 20), dark); steer.position.set(0.1, 1.65, 0); steer.rotation.y = Math.PI / 2; steer.rotation.x = 0.6; root.add(steer);
  // tejadillo protector (tubos)
  const tubeM = dark;
  for (const [x, z] of [[0.35, 0.5], [0.35, -0.5], [-0.85, 0.5], [-0.85, -0.5]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 8), tubeM); t.position.set(x, 1.8, z); root.add(t); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 1.1), tubeM); roof.position.set(-0.25, 2.43, 0); roof.castShadow = true; root.add(roof);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 1.05), tubeM); b.position.set(-0.85 + i * 0.24, 2.46, 0); root.add(b); }
  // mástil
  const mast = new THREE.Group(); mast.position.set(0.85, 0, 0); root.add(mast);
  for (const s of [1, -1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.1), dark); ch.position.set(0, 1.4, s * 0.36); ch.castShadow = true; mast.add(ch); }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8), dark); cross.position.set(0, 2.65, 0); mast.add(cross);
  const carriage = new THREE.Group(); mast.add(carriage);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 1.0), dark); plate.position.set(0.1, 0.4, 0); carriage.add(plate);
  for (const s of [1, -1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.045, 0.12), M.acero(0x3a3d42, 0.5, 0.8)); f.position.set(0.68, 0.14, s * 0.3); f.castShadow = true; carriage.add(f); }
  const cargo = new THREE.Group(); cargo.position.set(0.7, 0.17, 0); carriage.add(cargo);
  // ruedas
  const wheels = [];
  for (const [x, r, s] of [[0.5, 0.32, 1], [0.5, 0.32, -1], [-0.9, 0.28, 1], [-0.9, 0.28, -1]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 18), M.goma()); w.rotation.x = Math.PI / 2; w.position.set(x, r, s * 0.5); w.castShadow = true; root.add(w); wheels.push(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.26, 12), M.pintura(0xd8d8d8, 0.4, 0.6)); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position); root.add(hub);
  }
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), M.emisivo(0xff8a1a, 3)); beacon.position.set(-0.6, 2.52, 0); root.add(beacon);
  root.userData = {
    carriage, cargo, wheels, beacon,
    setLift(h) { carriage.position.y = h; },
    rodar(d) { wheels.forEach((w) => (w.rotation.y += d / 0.3)); },
  };
  return root;
}

/* ---------- Palés con cajas ---------- */
let PALLET = null;
export function palletGeoms() {
  if (PALLET) return PALLET;
  const parts = [];
  const bx = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g.toNonIndexed(); };
  for (let i = 0; i < 7; i++) parts.push(bx(1.2, 0.022, 0.1, 0, 0.133, -0.45 + i * 0.15));
  for (const z of [-0.45, 0, 0.45]) { parts.push(bx(1.2, 0.022, 0.1, 0, 0.1, z)); for (const x of [-0.5, 0, 0.5]) parts.push(bx(0.145, 0.078, 0.1, x, 0.05, z)); }
  for (const x of [-0.5, 0, 0.5]) parts.push(bx(0.145, 0.022, 1.0, x, 0.011, 0));
  const pal = mergeGeometries(parts);
  // bloque de cajas (con costuras simuladas por geometría de 2x2x3 cajas)
  const boxes = [];
  for (let ix = 0; ix < 2; ix++) for (let iz = 0; iz < 2; iz++) for (let iy = 0; iy < 3; iy++) {
    const g = new THREE.BoxGeometry(0.57, 0.38, 0.48); g.translate(-0.29 + ix * 0.58, 0.144 + 0.19 + iy * 0.385, -0.245 + iz * 0.49); boxes.push(g.toNonIndexed());
  }
  PALLET = { pal, boxes: mergeGeometries(boxes), h: 0.144 + 3 * 0.385 };
  return PALLET;
}
/** Palé cargado como Group (para animarlo con la carretilla). */
export function makePallet({ film = true } = {}) {
  const g = new THREE.Group();
  const pg = palletGeoms();
  const p = new THREE.Mesh(pg.pal, M.madera('roble', 0.3, 0.3)); p.castShadow = true; p.receiveShadow = true;
  const b = new THREE.Mesh(pg.boxes, M.carton()); b.castShadow = true; b.receiveShadow = true;
  g.add(p, b);
  if (film) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, pg.h - 0.13, 1.0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.18, depthWrite: false }));
    f.position.y = 0.144 + (pg.h - 0.144) / 2; g.add(f);
  }
  return g;
}
/** Muchos palés instanciados. positions: [{x,y,z,ry}] */
export function makePallets(positions) {
  const pg = palletGeoms();
  const a = new THREE.InstancedMesh(pg.pal, M.madera('roble', 0.3, 0.3), positions.length);
  const b = new THREE.InstancedMesh(pg.boxes, M.carton(), positions.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  positions.forEach((o, i) => { e.set(0, o.ry || 0, 0); q.setFromEuler(e); p.set(o.x, o.y || 0, o.z); m.compose(p, q, s); a.setMatrixAt(i, m); b.setMatrixAt(i, m); });
  [a, b].forEach((x) => { x.castShadow = true; x.receiveShadow = true; x.instanceMatrix.needsUpdate = true; x.computeBoundingSphere(); });
  const g = new THREE.Group(); g.add(a, b); return g;
}

export { DIM };
