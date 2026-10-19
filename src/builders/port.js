/* =====================================================================
 *  INFRAESTRUCTURA — muelle, suelos, farolas, naves, báscula, edificios,
 *  semáforo de riesgo, barrera, escáner, vallas, árboles y carreteras.
 * ===================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as M from '../core/materials.js';
import * as TX from '../core/textures.js';

const bx = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g.toNonIndexed(); };

/** Suelo de hormigón grande. */
export function suelo({ ancho = 400, fondo = 300, x = 0, z = 0, rep = 40, material } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, fondo), material || M.hormigon(rep));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); m.receiveShadow = true; m.name = 'suelo';
  return m;
}

/** Muelle: losa con cantil hacia +Z (agua), defensas y bolardos. */
export function muelle({ largo = 400, zCantil = 12, altura = 3.0, fondo = 260 } = {}) {
  const g = new THREE.Group(); g.name = 'muelle';
  const top = new THREE.Mesh(new THREE.PlaneGeometry(largo, fondo), M.hormigon(Math.round(largo / 10)));
  top.rotation.x = -Math.PI / 2; top.position.set(0, 0, zCantil - fondo / 2); top.receiveShadow = true; g.add(top);
  const face = new THREE.Mesh(new THREE.BoxGeometry(largo, altura + 8, 1.2), M.hormigon(20)); face.position.set(0, -(altura + 8) / 2, zCantil - 0.6); face.receiveShadow = true; g.add(face);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.25, 1.4), M.pintura(0xcfcfc8, 0.8, 0)); cap.position.set(0, 0.12, zCantil - 0.7); g.add(cap);
  // franja amarilla de seguridad
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(largo, 0.25), M.pintura(0xe2b019, 0.7, 0)); stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.02, zCantil - 2.2); g.add(stripe);
  // defensas y bolardos
  const def = [], bol = [];
  for (let x = -largo / 2 + 8; x < largo / 2; x += 16) {
    def.push(bx(2.2, 2.6, 0.6, x, -1.6, zCantil + 0.2));
    const b = new THREE.CylinderGeometry(0.28, 0.35, 0.7, 12); b.translate(x + 4, 0.35, zCantil - 1.2); bol.push(b.toNonIndexed());
    const bh = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12); bh.translate(x + 4, 0.72, zCantil - 1.2); bol.push(bh.toNonIndexed());
  }
  const dm = new THREE.Mesh(mergeGeometries(def), M.goma()); g.add(dm);
  const bm = new THREE.Mesh(mergeGeometries(bol), M.pintura(0x22272c, 0.5, 0.6)); bm.castShadow = true; g.add(bm);
  return g;
}

/** Farolas altas (torres de iluminación) instanciadas. */
export function farolas(posiciones, { alto = 28, encendidas = false } = {}) {
  const g = new THREE.Group();
  const poste = new THREE.CylinderGeometry(0.25, 0.45, alto, 10); poste.translate(0, alto / 2, 0);
  const cab = new THREE.BoxGeometry(3.4, 0.5, 1.2); cab.translate(0, alto + 0.2, 0);
  const pm = new THREE.InstancedMesh(poste, M.acero(0x8d939a, 0.45, 0.8), posiciones.length);
  const cm = new THREE.InstancedMesh(cab, M.acero(0x30343a, 0.5, 0.6), posiciones.length);
  const lm = new THREE.InstancedMesh((() => { const l = new THREE.BoxGeometry(3.0, 0.08, 0.9); l.translate(0, alto - 0.08, 0); return l; })(), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff0d2, emissiveIntensity: encendidas ? 5 : 0 }), posiciones.length);
  const m = new THREE.Matrix4();
  posiciones.forEach((p, i) => { m.makeTranslation(p.x, 0, p.z); pm.setMatrixAt(i, m); cm.setMatrixAt(i, m); lm.setMatrixAt(i, m); });
  [pm, cm, lm].forEach((x) => { x.instanceMatrix.needsUpdate = true; x.computeBoundingSphere(); });
  pm.castShadow = true; g.add(pm, cm, lm);
  g.userData.luzMat = lm.material;
  return g;
}

/** Nave industrial con muelles de carga en la fachada +Z. */
export function nave({ ancho = 60, fondo = 36, alto = 11, color = 0xb9bfc5, puertas = 5, abierta = 2, rotulo = null, colorRotulo = '#12233d' } = {}) {
  const g = new THREE.Group(); g.name = 'nave';
  const wallM = M.chapaOndulada(color, ancho / 3, 1);
  const sideM = M.chapaOndulada(color, fondo / 3, 1);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), wallM); front.position.set(0, alto / 2, fondo / 2); front.receiveShadow = true; g.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), wallM); back.position.set(0, alto / 2, -fondo / 2); back.rotation.y = Math.PI; g.add(back);
  for (const s of [1, -1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(fondo, alto), sideM); w.position.set(s * ancho / 2, alto / 2, 0); w.rotation.y = s * Math.PI / 2; w.receiveShadow = true; w.castShadow = true; g.add(w); }
  const roofM = M.chapaOndulada(0x7b828a, ancho / 5, 1).clone(); roofM.normalScale = new THREE.Vector2(0.45, 0.45);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(ancho + 1, 0.4, fondo + 1), roofM); roof.position.y = alto + 0.2; roof.castShadow = true; g.add(roof);
  // zócalo de hormigón
  const zocalo = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.2, 1.3, fondo + 0.2), M.hormigon(6)); zocalo.position.y = 0.65; g.add(zocalo);
  // muelles de carga
  const docks = [];
  const pw = 3.2, ph = 3.4, sep = ancho / (puertas + 1);
  const interior = M.pintura(0x0b0d10, 1, 0);
  const doorM = M.chapaOndulada(0xd7dadd, 1, 6);
  doorM.normalMap.rotation = Math.PI / 2;
  for (let i = 0; i < puertas; i++) {
    const x = -ancho / 2 + sep * (i + 1);
    const abiertaP = i === abierta;
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.9, ph + 0.8, 0.5), M.pintura(0x15171a, 0.9, 0)); shelter.position.set(x, 1.2 + ph / 2, fondo / 2 + 0.26); g.add(shelter);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), abiertaP ? interior : doorM); hole.position.set(x, 1.2 + ph / 2, fondo / 2 + 0.52); g.add(hole);
    if (abiertaP) { const rolled = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, pw, 12), doorM); rolled.rotation.z = Math.PI / 2; rolled.position.set(x, 1.2 + ph + 0.1, fondo / 2 + 0.6); g.add(rolled); }
    const leveller = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.15, 1.2), M.acero(0x3b3f45, 0.5, 0.7)); leveller.position.set(x, 1.25, fondo / 2 + 0.7); g.add(leveller);
    for (const s of [1, -1]) { const bump = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), M.goma()); bump.position.set(x + s * 1.3, 1.0, fondo / 2 + 0.5); g.add(bump); }
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.2), M.emisivo(abiertaP ? 0x2bff6a : 0xff3322, 2.5)); light.position.set(x + pw / 2 + 0.6, 1.2 + ph + 0.4, fondo / 2 + 0.55); g.add(light);
    docks.push(new THREE.Vector3(x, 1.2, fondo / 2));
  }
  // marquesina
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.9, 0.25, 3.5), M.acero(0x6d737a, 0.5, 0.7)); canopy.position.set(0, 1.2 + ph + 1.4, fondo / 2 + 1.75); canopy.castShadow = true; g.add(canopy);
  if (rotulo) {
    const tex = TX.textPanel('rot' + rotulo, 1024, 160, (ctx, w, h) => {
      ctx.fillStyle = '#f4f2ec'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = colorRotulo; ctx.font = '800 92px Inter, Arial'; ctx.textBaseline = 'middle'; ctx.fillText(rotulo, 40, h / 2 + 4);
      ctx.fillStyle = '#d9622b'; ctx.fillRect(0, h - 16, w, 16);
    });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(ancho * 0.55, ancho * 0.55 * 160 / 1024), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    s.position.set(-ancho * 0.12, alto - 1.8, fondo / 2 + 0.05); g.add(s);
  }
  g.userData.docks = docks;
  return g;
}

/** Báscula de pesaje con pantalla. */
export function bascula({ texto = '18.720 kg' } = {}) {
  const g = new THREE.Group(); g.name = 'bascula';
  const pl = new THREE.Mesh(new THREE.BoxGeometry(20, 0.16, 3.4), M.acero(0x55595f, 0.6, 0.7)); pl.position.y = 0.08; pl.receiveShadow = true; g.add(pl);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.1, 3.8), M.franjas(16)); frame.position.y = 0.03; g.add(frame);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), M.acero(0x30343a, 0.5, 0.6)); pole.position.set(11.5, 2, -3); g.add(pole);
  const disp = TX.textPanel('vgm' + texto, 512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, w, h);
    ctx.font = '700 22px "JetBrains Mono", monospace'; ctx.fillStyle = '#ff9a3c'; ctx.fillText('VGM · SOLAS', 24, 38);
    ctx.font = '700 84px "JetBrains Mono", monospace'; ctx.fillStyle = '#ffb347'; ctx.fillText(texto, 24, 140);
    ctx.font = '500 18px "JetBrains Mono", monospace'; ctx.fillStyle = '#9b6a35'; ctx.fillText('OCNU 482913 6', 24, 178);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: disp, emissiveIntensity: 1.4, map: disp }));
  screen.position.set(11.5, 4.2, -2.88); g.add(screen);
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 0.2), M.acero(0x22262b, 0.5, 0.6)); box.position.set(11.5, 4.2, -3.0); g.add(box);
  g.userData.pantalla = screen;
  return g;
}

/** Edificio de oficinas/control (2-3 plantas) con ventanas emisivas. */
export function edificio({ ancho = 16, fondo = 10, plantas = 2, color = 0xe2e0da, luces = 0.4, rotulo = null, antena = false, seed = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'edificio';
  const h = plantas * 3.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(ancho, h, fondo), M.pintura(color, 0.8, 0.05)); body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const wp = TX.windowsPair({ cols: Math.round(ancho / 2.2), rows: plantas, lit: luces, warm: false, seed, pared: '#' + new THREE.Color(color).getHexString() });
  const winM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wp.map, emissive: 0xffffff, emissiveMap: wp.emissive, emissiveIntensity: luces > 0 ? 1.2 : 0, roughness: 0.4, metalness: 0.2 });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho - 0.6, h - 0.8), winM); p.position.set(0, h / 2, s * (fondo / 2 + 0.02)); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.4, 0.4, fondo + 0.4), M.pintura(0x5b6168, 0.7, 0.2)); roof.position.y = h + 0.2; g.add(roof);
  const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.6), M.acero(0x9aa0a6, 0.5, 0.7)); hvac.position.set(ancho * 0.25, h + 1, 0); hvac.castShadow = true; g.add(hvac);
  if (antena) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 9, 8), M.acero(0xbfc3c8, 0.4, 0.8)); mast.position.set(-ancho * 0.3, h + 4.5, 0); g.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), M.pintura(0xeeeeee, 0.5, 0.2)); dish.position.set(-ancho * 0.3 + 0.5, h + 6.5, 0); dish.rotation.z = -1.1; g.add(dish);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M.emisivo(0xff2020, 6)); blink.position.set(-ancho * 0.3, h + 9.1, 0); g.add(blink); g.userData.blink = blink;
  }
  if (rotulo) {
    const tex = TX.textPanel('edif' + rotulo, 1024, 128, (ctx, w, hh) => { ctx.fillStyle = '#12233d'; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = '#fff'; ctx.font = '700 64px Inter, Arial'; ctx.textBaseline = 'middle'; ctx.fillText(rotulo, 30, hh / 2 + 3); ctx.fillStyle = '#d9622b'; ctx.fillRect(w - 60, 0, 60, hh); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(ancho * 0.8, ancho * 0.1), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 })); s.position.set(0, h + 1.1, fondo / 2 + 0.25); g.add(s);
  }
  g.userData.winM = winM; g.userData.alto = h;
  return g;
}

/** Semáforo de análisis de riesgo (verde / naranja / rojo). */
export function semaforo() {
  const g = new THREE.Group(); g.name = 'semaforo';
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5, 12), M.acero(0x2c3036, 0.5, 0.7)); pole.position.y = 2.5; pole.castShadow = true; g.add(pole);
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.9, 2.5, 0.7, 3, 0.1), M.pintura(0x15181c, 0.6, 0.3)); housing.position.y = 6.0; housing.castShadow = true; g.add(housing);
  const cols = { verde: 0x19e36b, naranja: 0xff9a1f, rojo: 0xff2a1f };
  const mats = {};
  ['rojo', 'naranja', 'verde'].forEach((k, i) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: cols[k], emissiveIntensity: 0.05, roughness: 0.2 });
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), m); l.position.set(0, 6.75 - i * 0.75, 0.36); g.add(l);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 16, 1, true, 0, Math.PI), M.pintura(0x15181c, 0.6, 0.3)); visor.rotation.x = Math.PI / 2; visor.rotation.z = Math.PI; visor.position.set(0, 6.8 - i * 0.75, 0.5); g.add(visor);
    mats[k] = m;
  });
  g.userData.set = (canal) => { for (const k in mats) mats[k].emissiveIntensity = k === canal ? 7 : 0.05; };
  return g;
}

/** Barrera de salida (levante). */
export function barrera() {
  const g = new THREE.Group(); g.name = 'barrera';
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.6, 1.2, 0.5, 2, 0.05), M.pintura(0xe9e9e4, 0.5, 0.2)); box.position.y = 0.6; box.castShadow = true; g.add(box);
  const pivot = new THREE.Group(); pivot.position.set(0, 1.05, 0); g.add(pivot);
  const tex = TX.textPanel('barrera', 512, 32, (ctx, w, h) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#d32a1f'; ctx.fillRect(i * 64, 0, 64, h); } });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.08), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 })); arm.position.x = 3.5; arm.castShadow = true; pivot.add(arm);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M.emisivo(0xff3322, 4)); lamp.position.set(0, 1.3, 0); g.add(lamp);
  g.userData.pivot = pivot; g.userData.lamp = lamp;
  return g;
}

/** Pórtico escáner de rayos X para camiones. */
export function escaner() {
  const g = new THREE.Group(); g.name = 'escaner';
  const towerM = M.pintura(0xdedcd5, 0.6, 0.2);
  for (const s of [1, -1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6.5, 2.6), towerM); t.position.set(0, 3.25, s * 3.6); t.castShadow = true; t.receiveShadow = true; g.add(t);
    const st = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.6, 2.65), M.franjas(3)); st.position.set(0, 0.3, s * 3.6); g.add(st);
    const beac = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), M.emisivo(0xffa21a, 6)); beac.position.set(0.6, 6.9, s * 3.6); g.add(beac);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 9.8), towerM); top.position.set(0, 7.0, 0); top.castShadow = true; g.add(top);
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.35, 9.85), M.pintura(0x12233d, 0.5, 0.3)); band.position.set(0, 7.5, 0); g.add(band);
  const tex = TX.textPanel('escanerRot', 512, 96, (ctx, w, h) => { ctx.fillStyle = '#12233d'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.font = '700 46px Inter, Arial'; ctx.textBaseline = 'middle'; ctx.fillText('ADUANA · ESCÁNER', 20, h / 2 + 2); });
  for (const s of [1, -1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6 })); r.position.set(s * 1.23, 7.0, 0); r.rotation.y = s * Math.PI / 2; g.add(r); }
  // haz (plano aditivo, se anima)
  const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 6.2), new THREE.MeshBasicMaterial({ color: 0x55b8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  haz.rotation.y = Math.PI / 2; haz.position.set(0, 3.3, 0); haz.scale.set(1, 1, 1); g.add(haz);
  const haz2 = haz.clone(); haz2.scale.x = 40; haz2.material = haz.material.clone(); haz2.material.opacity = 0.08; g.add(haz2);
  g.userData.haz = [haz, haz2];
  return g;
}

/** Valla de malla entre puntos. */
export function valla(puntos, { alto = 2.4 } = {}) {
  const g = new THREE.Group();
  const meshM = new THREE.MeshStandardMaterial({ map: TX.fence().clone(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5, color: 0xc0c6cc });
  const posts = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1];
    const len = a.distanceTo(b);
    const t = meshM.map; t.repeat.set(len / 1.2, alto / 1.2);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, alto), meshM);
    p.position.set((a.x + b.x) / 2, alto / 2, (a.z + b.z) / 2); p.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); g.add(p);
    const n = Math.ceil(len / 3);
    for (let k = 0; k <= n; k++) { const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n; posts.push(bx(0.08, alto + 0.2, 0.08, x, (alto + 0.2) / 2, z)); }
  }
  const pm = new THREE.Mesh(mergeGeometries(posts), M.acero(0x7a8087, 0.5, 0.7)); g.add(pm);
  return g;
}

/** Árboles instanciados (tronco + copa irregular). */
export function arboles(posiciones, { seed = 1 } = {}) {
  const g = new THREE.Group();
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, 3.4, 8); trunk.translate(0, 1.7, 0);
  // copa: varios lóbulos deformados con ruido, sombreado suave
  const lobulos = [[0, 4.6, 0, 2.1], [1.1, 4.0, 0.5, 1.5], [-1.0, 4.2, -0.4, 1.6], [0.2, 5.6, -0.6, 1.4], [-0.4, 3.9, 1.0, 1.3]];
  const partes = lobulos.map(([x, y, z, r], li) => {
    const ge = new THREE.IcosahedronGeometry(r, 2);
    const p = ge.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = Math.sin(v.x * 3.1 + seed + li) * Math.cos(v.y * 2.7 + li) * Math.sin(v.z * 3.3 + seed) * 0.16 + Math.sin(v.x * 7.3 + v.z * 6.1 + li) * 0.05;
      v.multiplyScalar(1 + n); p.setXYZ(i, v.x, v.y * 0.92, v.z);
    }
    ge.computeVertexNormals(); ge.translate(x, y, z);
    return ge;
  });
  const crown = mergeGeometries(partes);
  const tm = new THREE.InstancedMesh(trunk, M.pintura(0x4a3627, 0.9, 0), posiciones.length);
  const cm = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0x3f6b2e, roughness: 0.88, metalness: 0 }), posiciones.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3(), c = new THREE.Color();
  posiciones.forEach((o, i) => {
    const k = o.s ?? 1; s.set(k, k * (0.9 + (i % 5) * 0.06), k); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.3); pp.set(o.x, 0, o.z);
    m.compose(pp, q, s); tm.setMatrixAt(i, m); cm.setMatrixAt(i, m);
    c.setHSL(0.24 + ((i * 37) % 10) / 160, 0.42, 0.22 + ((i * 13) % 10) / 110); cm.setColorAt(i, c);
  });
  [tm, cm].forEach((x) => { x.castShadow = true; x.receiveShadow = true; x.instanceMatrix.needsUpdate = true; x.computeBoundingSphere(); });
  g.add(tm, cm);
  return g;
}

/** Carretera recta con marcas viales. */
export function carretera({ largo = 400, ancho = 8, x = 0, z = 0, ry = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const r = new THREE.Mesh(new THREE.PlaneGeometry(largo, ancho), M.asfalto(largo / 8, ancho / 8)); r.rotation.x = -Math.PI / 2; r.position.y = 0.02; r.receiveShadow = true; g.add(r);
  const dash = new THREE.PlaneGeometry(3, 0.15); dash.rotateX(-Math.PI / 2);
  const n = Math.floor(largo / 9);
  const im = new THREE.InstancedMesh(dash, M.pintura(0xf0f0ea, 0.6, 0), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m.makeTranslation(-largo / 2 + i * 9 + 4.5, 0.03, 0); im.setMatrixAt(i, m); }
  im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); g.add(im);
  for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(largo, 0.15), M.pintura(0xf0f0ea, 0.6, 0)); e.rotation.x = -Math.PI / 2; e.position.set(0, 0.03, s * (ancho / 2 - 0.3)); g.add(e); }
  return g;
}

/** Colinas lejanas (silueta en niebla). */
export function colinas({ radio = 900, alto = 60, seed = 1, color = 0x5b6b4f } = {}) {
  const geo = new THREE.CylinderGeometry(radio, radio, alto, 160, 6, true);
  const p = geo.attributes.position;
  const base = new THREE.Color(color), cima = base.clone().offsetHSL(0, -0.08, 0.1), pie = base.clone().multiplyScalar(0.6);
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const h = (Math.sin(a * 5 + seed) * 0.5 + Math.sin(a * 13 + seed * 2) * 0.25 + Math.sin(a * 29 + seed) * 0.1 + Math.sin(a * 61) * 0.04 + 0.6) * alto;
    const k = (y + alto / 2) / alto; // 0 abajo → 1 arriba
    p.setY(i, -alto / 2 + k * (h + alto / 2));
    const c = pie.clone().lerp(base, Math.min(1, k * 1.6)).lerp(cima, Math.max(0, k - 0.6) * 1.5);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.BackSide }));
}
