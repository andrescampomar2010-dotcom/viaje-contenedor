/* =====================================================================
 *  ESCENA 5 · TERMINAL DE DESTINO — amanecer con bruma. Descarga,
 *  depósito temporal, ENS/ICS2, análisis de riesgo y demoras.
 * ===================================================================== */
import * as THREE from 'three';
import { cieloExterior, domoBruma } from '../core/environment.js';
import { mar } from '../core/effects.js';
import * as TX from '../core/textures.js';
import * as M from '../core/materials.js';
import { makeSTSCrane, cicloGrua } from '../builders/crane.js';
import { makeShip } from '../builders/ship.js';
import { makeYard, slotsPila, makeContainer, DIM } from '../builders/container.js';
import { makeTruck } from '../builders/vehicles.js';
import { muelle, farolas, edificio, semaforo, valla, colinas } from '../builders/port.js';
import { DATA } from '../data.js';

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  const env = cieloExterior(scene, renderer, q, {
    elev: 3.5, azim: 95, turbidez: 9, rayleigh: 3.0, mie: 0.01, mieG: 0.9, nubes: 0.5, densidadNubes: 0.5,
    colorSol: 0xffb898, intensidadSol: 1.9, intensidadHemi: 0.55, cieloHemi: 0xb8c4dc, sueloHemi: 0x4a4440,
    niebla: { color: 0xb3aeb4, densidad: 0.0042 }, exposicion: 0.62, intensidadEntorno: 0.8,
    sombra: { centro: new THREE.Vector3(0, 0, -10), radio: 70, bias: -0.0008 },
  });

  domoBruma(scene, { color: 0xb3aeb4, altura: 0.32, opacidad: 0.97 });
  const water = mar({ tam: 4000, q, sunDir: env.sunDir, colorAgua: 0x1b3440, colorSol: 0xffc9a8, distorsion: 1.8 });
  water.position.y = -2.2; scene.add(water);
  scene.add(muelle({ largo: 500, zCantil: 12, fondo: 300 }));
  scene.add(colinas({ radio: 1200, alto: 70, seed: 9, color: 0x6f7480 }));

  const ship = makeShip({ L: 176, B: 30, densidad: q.densidad * 0.8, nombre: 'OCEANIS AURORA', luces: true, huecos: [{ b: 3, f: 6 }] });
  ship.position.set(0, -2.2, 28.5); scene.add(ship);
  const crane = makeSTSCrane({ color: 0xd9d7d0, acento: 0xc9592a, luces: true }); crane.position.set(-14, 0, 9); scene.add(crane);
  const crane2 = makeSTSCrane({ color: 0xd9d7d0, acento: 0xc9592a, luces: true }); crane2.position.set(36, 0, 9); scene.add(crane2);
  crane2.userData.setTrolley(30); crane2.userData.setHoist(18); crane2.userData.actualizarCables();
  const bayX = ship.userData.zonaIni + ship.userData.bayLen * 3.5;
  ship.position.x += crane.position.x - (ship.position.x + bayX);
  const filas = Math.floor((30 - 3) / (DIM.W + 0.03));
  const zHueco = ship.position.z - crane.position.z + (-((filas - 1) * (DIM.W + 0.03)) / 2 + 6 * (DIM.W + 0.03));
  const deck = ship.position.y + ship.userData.top;

  const truck = makeTruck({ color: 0x1d3f6e, franja: 0xd9622b, colorCont: 0x1f4573, marca: 'OCEANIS' });
  truck.position.set(-14, 0, -10); scene.add(truck);
  truck.userData.faroM.emissiveIntensity = 4;
  const contCam = truck.userData.contenedor;
  const colgado = makeContainer({ color: 0x1f4573, marca: 'OCEANIS', precinto: false });
  const ciclo = cicloGrua(crane, {
    zPick: zHueco, yPick: deck - 1.2, zDrop: truck.position.z - crane.position.z, yDrop: 1.32 + DIM.H + 0.05,
    ySafe: deck + 6 * DIM.H + 4, periodo: 36, contenedor: colgado,
    onFase: (f) => { contCam.visible = f >= 5 || f <= 1; },
  });

  // Depósito temporal vallado con pilas
  const slots = [
    ...slotsPila({ x0: -70, z0: -52, bahias: 5, filas: 6, alturaMax: 4, densidad: q.densidad, seed: 21 }),
    ...slotsPila({ x0: 10, z0: -52, bahias: 4, filas: 6, alturaMax: 3, densidad: q.densidad, seed: 23 }),
    ...slotsPila({ x0: -70, z0: -92, bahias: 11, filas: 5, alturaMax: 5, densidad: q.densidad, seed: 27 }),
  ];
  scene.add(makeYard(slots));
  scene.add(valla([new THREE.Vector3(-82, 0, -30), new THREE.Vector3(60, 0, -30)], { alto: 2.6 }));
  const zonaTex = TX.textPanel('dt', 1024, 160, (ctx, w, h) => { ctx.fillStyle = '#12233d'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.font = '700 70px Inter, Arial'; ctx.textBaseline = 'middle'; ctx.fillText('DEPÓSITO TEMPORAL · ZONA ADUANERA', 30, h / 2 + 3); });
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshStandardMaterial({ map: zonaTex, emissive: 0xffffff, emissiveMap: zonaTex, emissiveIntensity: 0.35 })); cartel.position.set(-20, 4.6, -30.1); cartel.rotation.y = Math.PI; scene.add(cartel);
  for (const x of [-26.5, -13.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.6, 0.2), M.acero(0x6a7078, 0.5, 0.7)); p.position.set(x, 2.3, -30); scene.add(p); }

  // Centro de control (ENS · ICS2)
  const ctrl = edificio({ ancho: 20, fondo: 12, plantas: 3, rotulo: 'CONTROL · ICS2', luces: 0.75, antena: true, seed: 6 });
  ctrl.position.set(64, 0, -12); ctrl.rotation.y = -0.4; scene.add(ctrl);

  // Semáforo de riesgo
  const sem = semaforo(); sem.position.set(28, 0, -22); sem.rotation.y = 2.75; scene.add(sem);
  sem.userData.set(DATA.canalInicial);
  // Panel de demoras
  const dem = TX.textPanel('demoras', 768, 384, (ctx, w, h) => {
    ctx.fillStyle = '#040608'; ctx.fillRect(0, 0, w, h);
    ctx.font = '700 30px "JetBrains Mono", monospace'; ctx.fillStyle = '#ff9a3c'; ctx.fillText('CONTENEDORES · DÍAS LIBRES', 24, 50);
    const rows = [['OCNU 482913 6', '5/7', '#ff5a3c'], ['MRVU 551208 4', '2/7', '#5bd98a'], ['NTRU 330918 2', '6/7', '#ffb347'], ['KYOU 771045 0', '1/7', '#5bd98a']];
    rows.forEach((r, i) => { ctx.fillStyle = '#ffd7a0'; ctx.font = '500 32px "JetBrains Mono", monospace'; ctx.fillText(r[0], 24, 120 + i * 62); ctx.fillStyle = r[2]; ctx.fillText(r[1], w - 140, 120 + i * 62); });
  });
  const board = new THREE.Group(); board.position.set(-46, 0, -24); board.rotation.y = 2.3; scene.add(board);
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: dem, emissiveIntensity: 1.3, map: dem })); bm.position.y = 6; board.add(bm);
  const bf = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 0.3), M.acero(0x1e2227, 0.5, 0.6)); bf.position.set(0, 6, -0.17); board.add(bf);
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 0.25), M.acero(0x6a7078, 0.5, 0.7)); p.position.set(s * 2.6, 3, -0.2); board.add(p); }

  const far = farolas([{ x: -40, z: -20 }, { x: 10, z: -20 }, { x: 55, z: -40 }, { x: -80, z: -60 }, { x: 0, z: -70 }], { encendidas: true }); scene.add(far);

  const anclas = {};
  const mk = (p, parent = scene) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); return o; };
  anclas['thc-destino'] = mk(new THREE.Vector3(0, 3, 0), crane.userData.spreader);
  anclas['ens'] = mk(new THREE.Vector3(64, 13, -12));
  anclas['riesgo'] = mk(new THREE.Vector3(28, 7.6, -22));
  anclas['almacenaje'] = mk(new THREE.Vector3(-32, 12, -45));
  anclas['demoras'] = mk(new THREE.Vector3(-46, 8.2, -24));

  return {
    id: 'terminal-destino', scene,
    post: { ao: false, bloom: 0.32, umbral: 0.86 },
    camara: {
      intro: { pos: new THREE.Vector3(160, 90, -180), target: new THREE.Vector3(0, 10, 0) },
      main: { pos: new THREE.Vector3(72, 44, -128), target: new THREE.Vector3(-4, 10, -14) },
      distEnfoque: 30,
    },
    limites: { minDist: 10, maxDist: 220, maxPolar: 1.45, rangoAzim: 1.4, caja: new THREE.Box3(new THREE.Vector3(-110, 0, -110), new THREE.Vector3(110, 60, 60)) },
    anclas,
    update(dt, t) { env.update(t); water.userData.update(t); ciclo(t); if (ctrl.userData.blink) ctrl.userData.blink.visible = (t % 1.4) < 0.5; },
    onCanal(c) { sem.userData.set(c); },
  };
}
