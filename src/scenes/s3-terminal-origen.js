/* =====================================================================
 *  ESCENA 3 · TERMINAL DE ORIGEN — mediodía. Grúa pórtico cargando el
 *  buque, pilas de contenedores, báscula VGM, documentación y aduana.
 * ===================================================================== */
import * as THREE from 'three';
import { cieloExterior, domoBruma } from '../core/environment.js';
import { mar, Emisor } from '../core/effects.js';
import * as M from '../core/materials.js';
import { makeSTSCrane, cicloGrua } from '../builders/crane.js';
import { makeShip } from '../builders/ship.js';
import { makeYard, slotsPila, makeContainer, DIM } from '../builders/container.js';
import { makeTruck } from '../builders/vehicles.js';
import { muelle, farolas, bascula, edificio, colinas, suelo } from '../builders/port.js';

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  const env = cieloExterior(scene, renderer, q, {
    elev: 58, azim: 205, turbidez: 3.5, rayleigh: 1.2, mie: 0.004, nubes: 0.38, densidadNubes: 0.5,
    colorSol: 0xfff5e8, intensidadSol: 3.6, intensidadHemi: 0.4,
    niebla: { color: 0xc3d0dc, densidad: 0.0022 }, exposicion: 0.42, intensidadEntorno: 0.6,
    sombra: { centro: new THREE.Vector3(5, 0, -10), radio: 75 },
  });
  domoBruma(scene, { color: 0xc3d0dc, altura: 0.12, opacidad: 0.85 });

  const water = mar({ tam: 5000, q, sunDir: env.sunDir, colorAgua: 0x0d3b45, distorsion: 2.2 });
  water.position.y = -2.2; scene.add(water);
  const quay = muelle({ largo: 500, zCantil: 12, fondo: 300 }); scene.add(quay);
  scene.add(colinas({ radio: 1400, alto: 90, seed: 5, color: 0x7d8a86 }));

  // Buque atracado (costado a 1 m del cantil)
  const ship = makeShip({ L: 176, B: 30, densidad: q.densidad, huecos: [{ b: 4, f: 5 }] });
  ship.position.set(-6, -2.2, 12 + 1.5 + 15); scene.add(ship);

  // Grúas STS
  const crane = makeSTSCrane({ color: 0xe7e6e1, acento: 0x1f4573 }); crane.position.set(10, 0, 9); scene.add(crane);
  const crane2 = makeSTSCrane({ color: 0xe7e6e1, acento: 0x1f4573 }); crane2.position.set(-38, 0, 9); scene.add(crane2);
  crane2.userData.setTrolley(26); crane2.userData.setHoist(24); crane2.userData.actualizarCables();

  // Camión bajo la grúa con el contenedor protagonista
  const truck = makeTruck({ color: 0xf2f2ee, franja: 0xd9622b, colorCont: 0x1f4573, marca: 'OCEANIS' });
  truck.position.set(10, 0, -9.5); scene.add(truck);
  const contCam = truck.userData.contenedor;
  // copia que viaja colgada del spreader
  const colgado = makeContainer({ color: 0x1f4573, marca: 'OCEANIS', precinto: false });
  // posición local del hueco en el buque
  const bayX = ship.userData.zonaIni + ship.userData.bayLen * 4.5;
  const filas = Math.floor((30 - 3) / (DIM.W + 0.03));
  const zHueco = ship.position.z - crane.position.z + (-((filas - 1) * (DIM.W + 0.03)) / 2 + 5 * (DIM.W + 0.03));
  // alinear el buque para que el hueco quede bajo la grúa
  ship.position.x += crane.position.x - (ship.position.x + bayX);
  const deck = ship.position.y + ship.userData.top;
  const ciclo = cicloGrua(crane, {
    zPick: truck.position.z - crane.position.z, yPick: 1.32 + DIM.H + 0.05,
    zDrop: zHueco, yDrop: deck - 1.2, ySafe: deck + 6 * DIM.H + 4,
    periodo: 36, contenedor: colgado,
    onFase: (f) => { contCam.visible = f === 7 || f === 0 || f === 1; },
  });

  // Pilas del patio
  const slots = [
    ...slotsPila({ x0: -66, z0: -50, bahias: 4, filas: 6, alturaMax: 4, densidad: q.densidad, seed: 3 }),
    ...slotsPila({ x0: -6, z0: -50, bahias: 4, filas: 6, alturaMax: 4, densidad: q.densidad, seed: 7 }),
    ...slotsPila({ x0: 54, z0: -50, bahias: 3, filas: 6, alturaMax: 3, densidad: q.densidad, seed: 11 }),
    ...slotsPila({ x0: -66, z0: -88, bahias: 10, filas: 5, alturaMax: 5, densidad: q.densidad, seed: 13 }),
  ];
  scene.add(makeYard(slots));

  // Báscula VGM con camión
  const bas = bascula({ texto: '18.720 kg' }); bas.position.set(-24, 0, -27); scene.add(bas);
  const t2 = makeTruck({ color: 0xc9cdd2, franja: 0x1f4573, colorCont: 0x2d6a4c, marca: 'NORTRANS', codigo: 'NTRU 330918 2' });
  t2.position.set(-25, 0.16, -27); scene.add(t2);
  // Edificio de documentación y caseta de aduana de exportación
  const doc = edificio({ ancho: 18, fondo: 10, plantas: 3, rotulo: 'TERMINAL · DOCUMENTACIÓN', luces: 0.2, seed: 4 }); doc.position.set(-62, 0, -18); doc.rotation.y = 0.3; scene.add(doc);
  const adu = edificio({ ancho: 10, fondo: 7, plantas: 1, rotulo: 'ADUANA · EXPORTACIÓN', luces: 0.3, color: 0xf0efe9, seed: 9 }); adu.position.set(44, 0, -20); adu.rotation.y = -0.25; scene.add(adu);
  scene.add(farolas([{ x: -30, z: -55 }, { x: 30, z: -55 }, { x: 80, z: -30 }, { x: -80, z: -30 }]));
  const humoBuque = new Emisor({ max: Math.round(160 * q.particulas) || 30, tasa: 10 * q.particulas + 2, vida: 6, origen: ship.userData.humo, vel: new THREE.Vector3(0, 3.5, 0), dispersion: 1.0, tamIni: 2.5, tamFin: 14, alfa: 0.14, color: 0x9a9da2, viento: new THREE.Vector3(-1.2, 0.2, 0.6) });
  scene.add(humoBuque.points);

  const anclas = {};
  const mk = (p, parent = scene) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); return o; };
  anclas['thc-origen'] = mk(new THREE.Vector3(0, 3, 0), crane.userData.spreader);
  anclas['vgm'] = mk(new THREE.Vector3(-12.5, 5.2, -30));
  anclas['documentacion'] = mk(new THREE.Vector3(-62, 12, -18));
  anclas['dua-export'] = mk(new THREE.Vector3(44, 5.5, -20));

  return {
    id: 'terminal-origen', scene,
    post: { ao: false, bloom: 0.18, umbral: 0.96 },
    emisores: [humoBuque],
    camara: {
      intro: { pos: new THREE.Vector3(-170, 110, -190), target: new THREE.Vector3(0, 15, 0) },
      main: { pos: new THREE.Vector3(-92, 46, -118), target: new THREE.Vector3(-6, 14, -2) },
      distEnfoque: 32,
    },
    limites: { minDist: 10, maxDist: 230, maxPolar: 1.45, rangoAzim: 1.4, caja: new THREE.Box3(new THREE.Vector3(-110, 0, -110), new THREE.Vector3(110, 60, 60)) },
    anclas,
    update(dt, t) { env.update(t); water.userData.update(t); ciclo(t); humoBuque.update(dt); },
  };
}
