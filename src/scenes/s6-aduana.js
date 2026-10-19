/* =====================================================================
 *  ESCENA 6 · ADUANA — noche. Escáner de rayos X, oficina con pantalla de
 *  liquidación (arancel e IVA calculados en vivo) y barrera de levante.
 * ===================================================================== */
import * as THREE from 'three';
import { cieloExterior } from '../core/environment.js';
import * as TX from '../core/textures.js';
import * as M from '../core/materials.js';
import { makeTruck, makePallet } from '../builders/vehicles.js';
import { suelo, escaner, edificio, barrera, farolas, valla, colinas } from '../builders/port.js';
import { DATA } from '../data.js';
import { fmtEUR, fmtNum } from '../logic/costs.js';

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  const env = cieloExterior(scene, renderer, q, {
    elev: -4, azim: 300, turbidez: 2, rayleigh: 0.6, mie: 0.003, nubes: 0.25,
    colorSol: 0x9fb4e0, intensidadSol: 0.35, intensidadHemi: 0.18, cieloHemi: 0x4a5c84, sueloHemi: 0x14161a,
    niebla: { color: 0x10151e, densidad: 0.0085 }, exposicion: 1.1, intensidadEntorno: 0.25, colorSueloEntorno: 0x0a0c10,
    sombra: { centro: new THREE.Vector3(0, 0, 0), radio: 40 },
  });
  // la "luna" viene de arriba aunque el cielo sea de noche
  env.sol.position.set(-40, 80, 30);

  const asf = M.asfalto(40, 40).clone(); asf.roughness = 0.42; asf.metalness = 0.1; asf.color = new THREE.Color(0x8c8c8c);
  scene.add(suelo({ ancho: 400, fondo: 400, material: asf }));
  scene.add(colinas({ radio: 900, alto: 50, seed: 4, color: 0x151a22 }));
  // marcas de carril
  for (const z of [-3.2, 3.2]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.18), M.pintura(0xe2b019, 0.5, 0)); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.03, z); scene.add(l); }

  const scan = escaner(); scene.add(scan);
  // Camión cruzando el escáner
  const truck = makeTruck({ color: 0xf2f2ee, franja: 0xd9622b, colorCont: 0x1f4573, marca: 'OCEANIS' });
  truck.userData.faroM.emissiveIntensity = 6; truck.userData.pilotoM.emissiveIntensity = 3;
  scene.add(truck);
  const faro = new THREE.SpotLight(0xfff0d0, 60, 50, 0.5, 0.5, 1.5); faro.position.set(10.9, 1.3, 0); truck.add(faro);
  const faroT = new THREE.Object3D(); faroT.position.set(30, 0, 0); truck.add(faroT); faro.target = faroT;

  // Oficina de aduanas con pantalla de liquidación
  const ofi = edificio({ ancho: 22, fondo: 12, plantas: 2, rotulo: 'ADUANA · PUESTO DE VALMAR', luces: 0.85, color: 0xd8d6cf, seed: 12 });
  ofi.position.set(-6, 0, -20); scene.add(ofi);
  let calc = null;
  const liqTex = TX.textPanel('liquidacion', 1024, 640, (ctx, w, h) => dibujarLiquidacion(ctx, w, h, calc));
  const liq = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.5), new THREE.MeshStandardMaterial({ color: 0, map: liqTex, emissive: 0xffffff, emissiveMap: liqTex, emissiveIntensity: 1.1 }));
  liq.position.set(-6, 3.6, -13.85); scene.add(liq);
  const liqF = new THREE.Mesh(new THREE.BoxGeometry(7.6, 4.9, 0.2), M.acero(0x1a1d22, 0.5, 0.6)); liqF.position.set(-6, 3.6, -13.95); scene.add(liqF);

  // Quiosco con monitor del DUA
  const kiosk = new THREE.Group(); kiosk.position.set(-17, 0, -6); kiosk.rotation.y = 0.5; scene.add(kiosk);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.7), M.pintura(0x2a2f36, 0.5, 0.4)); kb.position.y = 0.8; kiosk.add(kb);
  const duaTex = TX.textPanel('dua', 640, 400, (ctx, w, h) => {
    const op = DATA.operacion;
    ctx.fillStyle = '#0d1520'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f4573'; ctx.fillRect(0, 0, w, 48);
    ctx.fillStyle = '#fff'; ctx.font = '700 24px Inter, Arial'; ctx.fillText('DUA · IMPORTACIÓN (IM-A)', 16, 33);
    ctx.font = '500 19px "JetBrains Mono", monospace'; ctx.fillStyle = '#b9c7d8';
    const L = [`MRN   ${op.mrnImport}`, `Decl. ${op.comprador.nombre}`, `Repr. Aduanas Arlanza (indirecta)`, `Part. ${op.partida.codigo}`, `Orig. Donghai (ficticio)  Rég. 40 00`, `Bultos ${op.mercancia.bultos}  P.bruto ${fmtNum(op.mercancia.pesoBruto)} kg`];
    L.forEach((t, i) => ctx.fillText(t, 16, 92 + i * 40));
    ctx.fillStyle = '#5bd98a'; ctx.font = '700 22px Inter, Arial'; ctx.fillText('● ADMITIDO · PENDIENTE DE LEVANTE', 16, h - 20);
  });
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshStandardMaterial({ color: 0, map: duaTex, emissive: 0xffffff, emissiveMap: duaTex, emissiveIntensity: 1.2 }));
  mon.position.set(0, 1.75, 0.36); mon.rotation.x = -0.2; kiosk.add(mon);
  const monF = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.66, 0.08), M.acero(0x16191d, 0.4, 0.6)); monF.position.set(0, 1.75, 0.31); monF.rotation.x = -0.2; kiosk.add(monF);

  // Zona de reconocimiento: palé con la mercancía y etiqueta
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 6), M.acero(0x5c6168, 0.5, 0.7)); canopy.position.set(16, 5, -12); canopy.castShadow = true; scene.add(canopy);
  for (const [x, z] of [[11.3, -9.3], [20.7, -9.3], [11.3, -14.7], [20.7, -14.7]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5, 0.25), M.acero(0x5c6168, 0.5, 0.7)); p.position.set(x, 2.5, z); scene.add(p); }
  const pal = makePallet(); pal.position.set(15, 0, -12); scene.add(pal);
  const pal2 = makePallet(); pal2.position.set(16.6, 0, -12.3); pal2.rotation.y = 0.2; scene.add(pal2);
  const etq = TX.textPanel('etiquetaPartida', 512, 320, (ctx, w, h) => {
    const op = DATA.operacion;
    ctx.fillStyle = '#fbfaf5'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#12233d'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#12233d'; ctx.font = '700 34px Inter, Arial'; ctx.fillText('NOVA-12 · LED', 30, 64);
    ctx.font = '700 46px "JetBrains Mono", monospace'; ctx.fillText(op.partida.codigo, 30, 140);
    ctx.font = '500 22px Inter, Arial'; ctx.fillStyle = '#5a6470'; ctx.fillText('Código ficticio · ejemplo didáctico', 30, 190);
    ctx.fillText('CE · 230 V · 12 W', 30, 240); ctx.fillText('Bulto 07/20', 30, 280);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshStandardMaterial({ map: etq, roughness: 0.6 })); label.position.set(15, 1.2, -11.47); scene.add(label);
  const luzRec = new THREE.PointLight(0xe8f0ff, 25, 16, 2); luzRec.position.set(16, 4.6, -12); scene.add(luzRec);

  // Barrera de levante a la salida
  const bar = barrera(); bar.position.set(26, 0, 3.8); bar.rotation.y = Math.PI / 2; scene.add(bar);
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 2.2), M.pintura(0xe9e9e4, 0.6, 0.1)); cabina.position.set(27.5, 1.4, 6.2); cabina.castShadow = true; scene.add(cabina);
  const cabV = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0xffe2a8, emissiveIntensity: 1.2 })); cabV.position.set(26.39, 1.8, 6.2); cabV.rotation.y = -Math.PI / 2; scene.add(cabV);

  // Iluminación nocturna
  const far = farolas([{ x: -12, z: 8 }, { x: 12, z: 8 }, { x: 30, z: -6 }, { x: -30, z: -6 }], { alto: 14, encendidas: true }); scene.add(far);
  const spot = new THREE.SpotLight(0xfff1d6, 1400, 80, 0.85, 0.6, 1.5); spot.position.set(-12, 14, 8); spot.target.position.set(0, 0, 0);
  spot.castShadow = q.sombras; spot.shadow.mapSize.set(q.shadowMap, q.shadowMap); spot.shadow.bias = -0.0005; scene.add(spot, spot.target);
  const spot2 = new THREE.SpotLight(0xfff1d6, 1100, 70, 0.8, 0.6, 1.5); spot2.position.set(30, 14, -6); spot2.target.position.set(22, 0, 0); scene.add(spot2, spot2.target);
  const spot3 = new THREE.SpotLight(0xd9e6ff, 1200, 70, 0.9, 0.6, 1.5); spot3.position.set(-22, 14, 4); spot3.target.position.set(-10, 0, -12); scene.add(spot3, spot3.target);
  scene.add(valla([new THREE.Vector3(-60, 0, 14), new THREE.Vector3(60, 0, 14)]));

  const anclas = {};
  const mk = (p, parent = scene) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); return o; };
  anclas['dua-import'] = mk(new THREE.Vector3(0, 2.4, 0.4), kiosk);
  anclas['partida'] = mk(new THREE.Vector3(15, 2.2, -11.3));
  anclas['arancel'] = mk(new THREE.Vector3(-6.4, 4.4, -13.6));
  anclas['iva'] = mk(new THREE.Vector3(-4.6, 2.6, -13.6));
  anclas['levante'] = mk(new THREE.Vector3(26, 2.0, 3.6));

  let abrir = 0, objetivoBarrera = 0, fase = 'aproxima', vel = 0;
  truck.position.x = -16;
  return {
    id: 'aduana', scene,
    post: { ao: true, bloom: 0.55, umbral: 0.8, radioBloom: 0.5, aoRadio: 1.2 },
    camara: {
      intro: { pos: new THREE.Vector3(-70, 40, 70), target: new THREE.Vector3(0, 3, -4) },
      main: { pos: new THREE.Vector3(-3, 15, 37), target: new THREE.Vector3(3, 2.5, -6) },
      distEnfoque: 15,
    },
    limites: { minDist: 4, maxDist: 90, maxPolar: 1.45, rangoAzim: 1.6, caja: new THREE.Box3(new THREE.Vector3(-40, 0, -30), new THREE.Vector3(40, 15, 20)) },
    anclas,
    update(dt, t) {
      // camión: se aproxima, pasa por el escáner, espera el levante y sale
      if (fase === 'aproxima') { vel = Math.min(6, vel + dt * 2); if (truck.position.x > 4) vel = Math.max(0.6, (12 - truck.position.x) * 0.7); if (truck.position.x >= 11.9) { fase = 'espera'; vel = 0; } }
      else if (fase === 'espera') { vel = 0; if (abrir > 0.85) fase = 'sale'; }
      else if (fase === 'sale') { vel = Math.min(9, vel + dt * 2.5); if (truck.position.x > 75) { fase = 'aproxima'; truck.position.x = -60; objetivoBarrera = 0; } }
      const dx = vel * dt; truck.position.x += dx; truck.userData.rodar(dx);
      const x = truck.position.x;
      const pasa = Math.abs(x - 2) < 9 && fase === 'aproxima';
      scan.userData.haz[0].material.opacity = pasa ? 0.55 + Math.sin(t * 30) * 0.15 : 0.12;
      scan.userData.haz[1].material.opacity = pasa ? 0.1 : 0.02;
      abrir += (objetivoBarrera - abrir) * Math.min(1, dt * 2.5);
      bar.userData.pivot.rotation.z = abrir * 1.45;
      bar.userData.lamp.material.emissive.setHex(abrir > 0.5 ? 0x22ff66 : 0xff3322);
    },
    onHotspot(id) { if (id === 'levante') objetivoBarrera = objetivoBarrera ? 0 : 1; },
    onEntrar() { objetivoBarrera = 0; abrir = 0; fase = 'aproxima'; truck.position.x = -16; vel = 3; },
    onCalculo(c) { calc = c; const d = liqTex.userData; d.draw(d.canvas.getContext('2d'), d.canvas.width, d.canvas.height); liqTex.needsUpdate = true; },
  };
}

function dibujarLiquidacion(ctx, w, h, c) {
  ctx.fillStyle = '#060a10'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d9622b'; ctx.fillRect(0, 0, w, 64);
  ctx.fillStyle = '#fff'; ctx.font = '700 34px Inter, Arial'; ctx.fillText('LIQUIDACIÓN · DUA DE IMPORTACIÓN', 24, 44);
  if (!c) return;
  const op = DATA.operacion;
  const rows = [
    ['Valor en aduana (CIF)', fmtEUR(c.valorAduana)],
    [`Arancel ${fmtNum(op.partida.arancel * 100, 1)} %`, fmtEUR(c.arancel)],
    ['Gastos hasta destino', fmtEUR(c.accesorios)],
    ['Base imponible IVA', fmtEUR(c.baseIVA)],
    [`IVA ${fmtNum(op.iva * 100, 0)} %`, fmtEUR(c.iva)],
  ];
  rows.forEach((r, i) => {
    const y = 128 + i * 82;
    ctx.fillStyle = i % 2 ? '#0d1520' : '#0a1018'; ctx.fillRect(16, y - 50, w - 32, 72);
    ctx.font = '500 32px Inter, Arial'; ctx.fillStyle = '#c4d2e3'; ctx.fillText(r[0], 36, y);
    ctx.font = '700 36px "JetBrains Mono", monospace'; ctx.fillStyle = i === 1 || i === 4 ? '#ffb347' : '#e8eef6';
    const tw = ctx.measureText(r[1]).width; ctx.fillText(r[1], w - 40 - tw, y);
  });
  ctx.font = '500 22px Inter, Arial'; ctx.fillStyle = '#6f8199'; ctx.fillText('Importes ficticios · ejemplo didáctico', 24, h - 22);
}
