/* =====================================================================
 *  GRÚA PÓRTICO DE MUELLE (STS) — procedural
 *  Ejes: X a lo largo del muelle, +Z hacia el agua, Y arriba.
 *  userData: setTrolley(z), setHoist(y), spreader, carga (Group)
 * ===================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as M from '../core/materials.js';
import { DIM } from './container.js';

function bx(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
  g.translate(x, y, z);
  return g.toNonIndexed();
}
/** Viga entre dos puntos (sección cuadrada s). */
function beam(a, b, s) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const g = new THREE.BoxGeometry(s, len, s);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  g.applyQuaternion(q);
  const m = a.clone().add(b).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g.toNonIndexed();
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function makeSTSCrane({ color = 0xe4e4df, acento = 0x1f4573, gauge = 30, legX = 9, alto = 42, alcance = 52, backreach = 22, luces = false } = {}) {
  const root = new THREE.Group(); root.name = 'grua-sts';
  const main = [], accent = [], dark = [], rails = [];
  const zW = 0, zL = -gauge; // patas lado agua / lado tierra
  // Patas (cajón ahusado) y travesaños
  for (const sx of [-1, 1]) {
    for (const z of [zW, zL]) {
      main.push(beam(V(sx * legX, 2.2, z), V(sx * legX * 0.92, alto, z), 1.5));
    }
    // viga de portal (inferior) entre patas, a 14 m
    main.push(beam(V(sx * legX * 0.98, 14, zW), V(sx * legX * 0.98, 14, zL), 1.1));
    // diagonales
    accent.push(beam(V(sx * legX * 0.98, 14, zW), V(sx * legX * 0.93, alto - 2, zL), 0.55));
    // traviesas inferiores con bogies
    dark.push(bx(2.6, 1.8, 6, sx * legX, 1.1, zW), bx(2.6, 1.8, 6, sx * legX, 1.1, zL));
    for (const z of [zW, zL]) for (const dz of [-2.2, -0.75, 0.75, 2.2]) dark.push(bx(0.5, 0.9, 0.9, sx * legX, 0.45, z + dz));
  }
  // vigas transversales superiores (a lo largo de X)
  for (const z of [zW, zL]) { main.push(bx(legX * 2 + 1.6, 2.2, 1.6, 0, alto, z)); main.push(bx(legX * 2, 1.0, 1.0, 0, 14, z)); }
  // Pluma y contrapluma (dos vigas cajón a lo largo de Z)
  const zMin = zL - backreach, zMax = zW + alcance;
  for (const sx of [-1, 1]) {
    accent.push(bx(1.3, 2.6, zMax - zMin, sx * 3.2, alto + 2.4, (zMin + zMax) / 2));
    // barandillas de pasarela
    dark.push(bx(0.06, 0.06, zMax - zMin, sx * 4.1, alto + 4.1, (zMin + zMax) / 2));
    for (let z = zMin; z < zMax; z += 2.5) dark.push(bx(0.05, 1.1, 0.05, sx * 4.1, alto + 3.6, z));
  }
  for (let z = zMin + 2; z < zMax; z += 6) main.push(bx(6.4, 0.5, 0.5, 0, alto + 1.3, z));
  // Castillete (A-frame) y tirantes
  const apexY = alto + 26, apexZ = zW - 4;
  for (const sx of [-1, 1]) {
    main.push(beam(V(sx * 3.2, alto + 3.5, zW + 1), V(sx * 2.2, apexY, apexZ), 1.2));
    main.push(beam(V(sx * 3.2, alto + 3.5, zL), V(sx * 2.2, apexY, apexZ), 1.2));
    dark.push(beam(V(sx * 2.2, apexY, apexZ), V(sx * 3.2, alto + 3.8, zW + alcance * 0.55), 0.35));
    dark.push(beam(V(sx * 2.2, apexY, apexZ), V(sx * 3.2, alto + 3.8, zMax - 1), 0.35));
    dark.push(beam(V(sx * 2.2, apexY, apexZ), V(sx * 3.2, alto + 3.8, zMin + 2), 0.35));
  }
  main.push(bx(5.4, 1.2, 1.2, 0, apexY, apexZ));
  // Sala de máquinas en la contrapluma
  main.push(bx(9, 5, 12, 0, alto + 6.2, zL - backreach * 0.55));
  accent.push(bx(9.1, 0.6, 12.1, 0, alto + 8.5, zL - backreach * 0.55));
  // carriles del muelle
  for (const z of [zW, zL]) rails.push(bx(400, 0.18, 0.25, 0, 0.09, z));

  const mk = (arr, mat, cast = true) => { const m = new THREE.Mesh(mergeGeometries(arr), mat); m.castShadow = cast; m.receiveShadow = true; root.add(m); return m; };
  mk(main, M.pintura(color, 0.55, 0.3));
  mk(accent, M.pintura(acento, 0.5, 0.35));
  mk(dark, M.acero(0x2b2e33, 0.6, 0.6));
  mk(rails, M.acero(0x6f747a, 0.35, 0.9), false);

  // Rótulo
  // Carro (trolley) con cabina
  const trolley = new THREE.Group(); trolley.position.set(0, alto + 0.8, zW + 10); root.add(trolley);
  const tb = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.6, 5), M.pintura(acento, 0.5, 0.35)); tb.castShadow = true; trolley.add(tb);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 3), M.pintura(color, 0.4, 0.2)); cabin.position.set(3.0, -2.4, 0.8); trolley.add(cabin);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.4, 3.05), M.cristalOscuro()); cabGlass.position.set(3.0, -2.6, 0.8); trolley.add(cabGlass);

  // Spreader
  const spreader = new THREE.Group(); root.add(spreader);
  const sp = [];
  sp.push(bx(DIM.L, 0.45, 0.5, 0, 0.5, 0), bx(1.4, 0.8, DIM.W, 0, 0.75, 0));
  for (const sx of [-1, 1]) sp.push(bx(0.4, 0.4, DIM.W, sx * (DIM.L / 2 - 0.2), 0.3, 0));
  const spM = new THREE.Mesh(mergeGeometries(sp), M.pintura(0xe7a01c, 0.5, 0.3)); spM.castShadow = true; spreader.add(spM);
  const carga = new THREE.Group(); carga.position.y = 0.05; spreader.add(carga);
  // Cables (4)
  const cableGeo = new THREE.BufferGeometry();
  cableGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3));
  const cables = new THREE.LineSegments(cableGeo, new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
  cables.frustumCulled = false; root.add(cables);

  // Focos bajo la pluma
  const focoM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff1d0, emissiveIntensity: luces ? 6 : 0 });
  for (let z = zL - 10; z < zMax; z += 12) for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), focoM); f.position.set(sx * 3.2, alto + 0.9, z); root.add(f); }

  const ud = root.userData;
  ud.trolley = trolley; ud.spreader = spreader; ud.carga = carga; ud.focoM = focoM;
  ud.alto = alto; ud.zW = zW; ud.zL = zL; ud.zMax = zMax;
  ud.setTrolley = (z) => { trolley.position.z = z; spreader.position.z = z; };
  ud.setHoist = (y) => { spreader.position.y = y; };
  ud.actualizarCables = () => {
    const a = cableGeo.attributes.position; let i = 0;
    for (const sx of [-1.6, 1.6]) for (const sz of [-0.8, 0.8]) {
      a.setXYZ(i++, sx, trolley.position.y - 0.8, trolley.position.z + sz);
      a.setXYZ(i++, sx * 0.6, spreader.position.y + 1.1, spreader.position.z + sz);
    }
    a.needsUpdate = true;
  };
  ud.setTrolley(zW + 10); ud.setHoist(20); ud.actualizarCables();
  return root;
}

/**
 * Ciclo de trabajo: coge en (zPick, yPick) y deja en (zDrop, yDrop).
 * Devuelve update(t) — t en segundos. onPhase(carga:boolean)
 */
export function cicloGrua(crane, { zPick, yPick, zDrop, yDrop, ySafe, periodo = 34, contenedor, offset = 0, onCarga, onFase }) {
  const ud = crane.userData;
  if (contenedor) { ud.carga.add(contenedor); contenedor.position.set(0, -DIM.H - 0.02, 0); }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  // fases: [duración, z0, z1, y0, y1, cargado]
  const F = [
    [0.12, zPick, zPick, ySafe, yPick, false],          // baja vacío
    [0.05, zPick, zPick, yPick, yPick, 'engancha'],     // engancha
    [0.13, zPick, zPick, yPick, ySafe, true],           // iza
    [0.2, zPick, zDrop, ySafe, ySafe, true],            // traslación
    [0.12, zDrop, zDrop, ySafe, yDrop, true],           // baja
    [0.05, zDrop, zDrop, yDrop, yDrop, 'suelta'],       // suelta
    [0.13, zDrop, zDrop, yDrop, ySafe, false],          // iza vacío
    [0.2, zDrop, zPick, ySafe, ySafe, false],           // vuelve
  ];
  let last = null;
  return (t) => {
    let u = (((t + offset) / periodo) % 1 + 1) % 1;
    for (let fi = 0; fi < F.length; fi++) {
      const [d, z0, z1, y0, y1, c] = F[fi];
      if (u <= d) {
        const k = ease(u / d);
        onFase && onFase(fi, u / d);
        ud.setTrolley(z0 + (z1 - z0) * k);
        ud.setHoist(y0 + (y1 - y0) * k);
        const cargado = c === 'engancha' ? k > 0.5 : c === 'suelta' ? k < 0.5 : c;
        ud.carga.visible = cargado;
        if (cargado !== last) { last = cargado; onCarga && onCarga(cargado); }
        break;
      }
      u -= d;
    }
    ud.actualizarCables();
  };
}
