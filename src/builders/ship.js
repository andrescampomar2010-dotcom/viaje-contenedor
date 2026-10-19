/* =====================================================================
 *  BUQUE PORTACONTENEDORES — casco loft procedural con colores por
 *  vértice (antiincrustante, línea de flotación, casco), superestructura,
 *  chimenea, contenedores en cubierta instanciados y luces de navegación.
 *  Ejes: X proa(+)/popa(-), Y arriba (flotación en y=0), Z babor/estribor.
 * ===================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as M from '../core/materials.js';
import * as TX from '../core/textures.js';
import { DIM, makeYard, MARCAS } from './container.js';

function semiManga(x, L, B) {
  // x en [-L/2, L/2]; popa con espejo, proa afilada
  const xn = x / (L / 2);
  let f = 1;
  if (xn > 0.32) { const k = (xn - 0.32) / 0.68; f = Math.sqrt(Math.max(0, 1 - Math.pow(k, 1.8))); }
  if (xn < -0.78) { const k = (-xn - 0.78) / 0.22; f = 1 - 0.22 * k * k; }
  return (B / 2) * f;
}

function casco(L, B, calado, francobordo) {
  const NS = 72, NP = 18;
  const pos = [], col = [], idx = [];
  const cAnti = new THREE.Color(0x7a2620), cFlot = new THREE.Color(0x15171a), cCasco = new THREE.Color(0x1b2f4f), cFranja = new THREE.Color(0xd9d6cc);
  const top = francobordo;
  const filas = [];
  for (let i = 0; i <= NS; i++) {
    const x = -L / 2 + (i / NS) * L;
    const xn = x / (L / 2);
    const hb = semiManga(x, L, B);
    // quilla elevada en proa (pie de roda) y en popa (bovedilla)
    let quilla = -calado;
    if (xn > 0.7) quilla += Math.pow((xn - 0.7) / 0.3, 2) * (calado * 0.9);
    if (xn < -0.86) quilla += Math.pow((-xn - 0.86) / 0.14, 1.5) * (calado * 0.75);
    // regala ligeramente más alta en proa (arrufo)
    const cubierta = top + (xn > 0.6 ? Math.pow((xn - 0.6) / 0.4, 2) * 3.2 : 0);
    const fila = [];
    for (let j = 0; j <= NP; j++) {
      const t = j / NP; // 0 quilla → 1 cubierta
      const y = quilla + (cubierta - quilla) * t;
      const s = Math.pow(1 - Math.pow(1 - Math.min(1, t * 1.25), 4), 0.25); // pantoque redondeado
      const flare = xn > 0.55 ? 1 + 0.08 * t * ((xn - 0.55) / 0.45) : 1; // abanico de proa
      const z = hb * s * flare;
      fila.push([x, y, z]);
    }
    filas.push(fila);
  }
  // malla para ambos costados
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NS; i++) for (let j = 0; j <= NP; j++) {
      const [x, y, z] = filas[i][j];
      pos.push(x, y, z * side);
      const c = y < -0.4 ? cAnti : y < 0.6 ? cFlot : y > filas[i][NP][1] - 0.7 ? cFranja : cCasco;
      col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) {
      const a = base + i * (NP + 1) + j, b = a + NP + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // cubierta (forma en planta)
  const shape = new THREE.Shape();
  shape.moveTo(filas[0][NP][0], 0);
  for (let i = 0; i <= NS; i++) shape.lineTo(filas[i][NP][0], filas[i][NP][2]);
  for (let i = NS; i >= 0; i--) shape.lineTo(filas[i][NP][0], -filas[i][NP][2]);
  const deck = new THREE.ShapeGeometry(shape, 1);
  deck.rotateX(-Math.PI / 2); deck.translate(0, top, 0);
  // espejo de popa
  const tr = [];
  const f0 = filas[0];
  for (let j = 0; j < NP; j++) {
    tr.push(f0[j][0], f0[j][1], f0[j][2], f0[j][0], f0[j][1], -f0[j][2], f0[j + 1][0], f0[j + 1][1], f0[j + 1][2]);
    tr.push(f0[j + 1][0], f0[j + 1][1], f0[j + 1][2], f0[j][0], f0[j][1], -f0[j][2], f0[j + 1][0], f0[j + 1][1], -f0[j + 1][2]);
  }
  const transom = new THREE.BufferGeometry(); transom.setAttribute('position', new THREE.Float32BufferAttribute(tr, 3)); transom.computeVertexNormals();
  return { hull: g, deck, transom, filas };
}

/**
 * opts: { L, B, nombre, densidad, bahias, luces, conContenedores }
 */
export function makeShip({ L = 176, B = 30, calado = 10, francobordo = 8, nombre = 'OCEANIS AURORA', densidad = 1, luces = false, conContenedores = true, huecos = [] } = {}) {
  const root = new THREE.Group(); root.name = 'buque';
  const { hull, deck, transom } = casco(L, B, calado, francobordo);
  const hullM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const h = new THREE.Mesh(hull, hullM); h.castShadow = true; h.receiveShadow = true; root.add(h);
  const dk = new THREE.Mesh(deck, M.pintura(0x5a3a2e, 0.85, 0.1)); dk.receiveShadow = true; root.add(dk);
  const tm = new THREE.Mesh(transom, new THREE.MeshStandardMaterial({ color: 0x1b2f4f, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide })); root.add(tm);

  const gray = M.pintura(0xd8d8d2, 0.6, 0.15);
  const parts = [], dark = [];
  const bxx = (w, hh, d, x, y, z) => { const g = new THREE.BoxGeometry(w, hh, d); g.translate(x, y, z); return g.toNonIndexed(); };
  const top = francobordo;
  // castillo de proa y rompeolas
  parts.push(bxx(10, 2.6, B * 0.42, L / 2 - 20, top + 1.6, 0));
  const bw = new THREE.BoxGeometry(0.6, 3.5, B * 0.7); bw.rotateZ(-0.35); bw.translate(L / 2 - 21, top + 2.6, 0); parts.push(bw.toNonIndexed());
  // superestructura (habilitación) a popa
  const sx = -L / 2 + 26;
  parts.push(bxx(14, 24, 22, sx, top + 12, 0));
  parts.push(bxx(16, 3, B + 1, sx + 1, top + 25.5, 0)); // puente con alerones
  parts.push(bxx(12, 1, 18, sx, top + 27.5, 0));
  // mástil de proa y de radar
  dark.push(bxx(0.6, 12, 0.6, L / 2 - 12, top + 9, 0), bxx(4, 0.3, 0.3, L / 2 - 12, top + 13, 0));
  dark.push(bxx(0.5, 6, 0.5, sx, top + 31, 0), bxx(5, 0.25, 0.25, sx, top + 33, 0));
  // brazolas de escotilla y trincas (puentes de trincaje)
  const zonaIni = sx + 12, zonaFin = L / 2 - 26;
  const bayLen = DIM.L + 1.4;
  const nB = Math.floor((zonaFin - zonaIni) / bayLen);
  for (let b = 0; b < nB; b++) {
    const cx = zonaIni + bayLen * (b + 0.5);
    parts.push(bxx(DIM.L + 0.6, 1.2, B - 3, cx, top + 0.6, 0));
    if (b > 0) dark.push(bxx(0.5, 6, B - 2, cx - bayLen / 2, top + 4.2, 0));
  }
  const pm = new THREE.Mesh(mergeGeometries(parts), gray); pm.castShadow = true; pm.receiveShadow = true; root.add(pm);
  const dm = new THREE.Mesh(mergeGeometries(dark), M.acero(0x2a2d31, 0.6, 0.6)); dm.castShadow = true; root.add(dm);

  // ventanas de la habilitación
  const wp = TX.windowsPair({ cols: 10, rows: 7, lit: 0.55, warm: true, seed: 5, pared: '#d6d6d0' });
  const winM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wp.map, emissive: 0xffffff, emissiveMap: wp.emissive, emissiveIntensity: luces ? 1.6 : 0, roughness: 0.45, metalness: 0.15 });
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(13, 20), winM); p.position.set(sx, top + 13, s * 11.02); if (s < 0) p.rotation.y = Math.PI; root.add(p);
  }
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), winM); fr.position.set(sx + 7.02, top + 13, 0); fr.rotation.y = Math.PI / 2; root.add(fr);
  const bridgeW = new THREE.Mesh(new THREE.PlaneGeometry(B, 1.6), M.cristalOscuro()); bridgeW.position.set(sx + 9.02, top + 25.6, 0); bridgeW.rotation.y = Math.PI / 2; root.add(bridgeW);

  // chimenea
  const funnel = new THREE.Group(); funnel.position.set(sx - 11, top, 0); root.add(funnel);
  const fu = new THREE.Mesh(new THREE.BoxGeometry(7, 16, 9), M.pintura(0xd9622b, 0.5, 0.2)); fu.position.y = 9; fu.castShadow = true; funnel.add(fu);
  const fband = new THREE.Mesh(new THREE.BoxGeometry(7.05, 2.2, 9.05), M.pintura(0x12233d, 0.5, 0.2)); fband.position.y = 15.5; funnel.add(fband);
  const fcap = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.6, 9.1), M.pintura(0x111111, 0.7, 0.3)); fcap.position.y = 17; funnel.add(fcap);
  const humo = new THREE.Object3D(); humo.position.set(sx - 11, top + 17.5, 0); root.add(humo);

  // nombre en proa y popa
  const nameTex = TX.textPanel('shipname' + nombre, 1024, 128, (ctx, w, hh) => {
    ctx.clearRect(0, 0, w, hh); ctx.fillStyle = '#eceae2'; ctx.font = '700 92px Inter, Arial'; ctx.textBaseline = 'middle'; ctx.fillText(nombre, 10, hh / 2);
  });
  const nameM = new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [1, -1]) {
    const xN = L / 2 - 42, ancho = 12;
    const z1 = semiManga(xN - ancho / 2, L, B), z2 = semiManga(xN + ancho / 2, L, B);
    const ang = Math.atan2(z1 - z2, ancho);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 1.5), nameM);
    p.position.set(xN, top - 1.4, s * (semiManga(xN, L, B) + 0.35));
    p.rotation.y = s > 0 ? ang : Math.PI - ang; root.add(p);
  }
  const stern = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), nameM); stern.position.set(-L / 2 - 0.05, top - 2.2, 0); stern.rotation.y = -Math.PI / 2; root.add(stern);
  // logotipo de naviera en el costado
  const logo = TX.containerDecal('OCEANIS LINE', '', '#e9e7df');
  const logoM = new THREE.MeshStandardMaterial({ map: logo, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.6 });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), logoM); p.position.set(4, top - 4.2, s * (B / 2 + 0.06)); if (s < 0) p.rotation.y = Math.PI; root.add(p); }

  // luces de navegación
  const navR = M.emisivo(0xff2a1a, luces ? 8 : 1.5), navG = M.emisivo(0x22ff66, luces ? 8 : 1.5), navW = M.emisivo(0xfff6e0, luces ? 8 : 1.5);
  const sph = new THREE.SphereGeometry(0.35, 10, 8);
  const lr = new THREE.Mesh(sph, navR); lr.position.set(sx + 8, top + 25.5, -(B / 2 + 0.5)); root.add(lr); // babor (rojo)
  const lg = new THREE.Mesh(sph, navG); lg.position.set(sx + 8, top + 25.5, B / 2 + 0.5); root.add(lg);
  const lw = new THREE.Mesh(sph, navW); lw.position.set(L / 2 - 12, top + 15.2, 0); root.add(lw);
  const lw2 = new THREE.Mesh(sph, navW); lw2.position.set(sx, top + 34.2, 0); root.add(lw2);

  // contenedores en cubierta
  if (conContenedores) {
    const slots = [];
    let r = 17; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const filas = Math.floor((B - 3) / (DIM.W + 0.03));
    for (let b = 0; b < nB; b++) {
      const cx = zonaIni + bayLen * (b + 0.5);
      for (let f = 0; f < filas; f++) {
        const z = -((filas - 1) * (DIM.W + 0.03)) / 2 + f * (DIM.W + 0.03);
        if (huecos.some((hq) => hq.b === b && hq.f === f)) continue;
        const centro = 1 - Math.abs(f - (filas - 1) / 2) / filas;
        const alt = Math.max(1, Math.round((3 + centro * 3) * (0.6 + rnd() * 0.4) * Math.min(1, 0.55 + densidad * 0.45)));
        for (let k = 0; k < alt; k++) slots.push({ x: cx, y: top + 1.2 + k * DIM.H, z, ry: 0, marca: Math.floor(rnd() * MARCAS.length), tono: rnd() });
      }
    }
    const yard = makeYard(slots, { sombras: true });
    root.add(yard);
    root.userData.slots = slots;
  }
  root.userData.humo = humo;
  root.userData.zonaIni = zonaIni; root.userData.bayLen = bayLen; root.userData.top = top;
  root.userData.navMats = [navR, navG, navW]; root.userData.winM = winM;
  return root;
}
