/* =====================================================================
 *  ESCENA 7 · ENTREGA — tarde soleada. El camión recorre la carretera y
 *  atraca en el muelle del comprador. Libre circulación.
 * ===================================================================== */
import * as THREE from 'three';
import { cieloExterior, domoBruma } from '../core/environment.js';
import { Emisor } from '../core/effects.js';
import * as M from '../core/materials.js';
import * as TX from '../core/textures.js';
import { makeTruck, makePallets } from '../builders/vehicles.js';
import { makeYard, DIM } from '../builders/container.js';
import { suelo, nave, farolas, valla, arboles, carretera, colinas } from '../builders/port.js';

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  const env = cieloExterior(scene, renderer, q, {
    elev: 28, azim: 232, turbidez: 4, rayleigh: 1.4, mie: 0.005, nubes: 0.45, densidadNubes: 0.55,
    colorSol: 0xffe6c4, intensidadSol: 3.4, intensidadHemi: 0.45, cieloHemi: 0xbcd3ee, sueloHemi: 0x5f6a3e,
    niebla: { color: 0xc6d2dc, densidad: 0.0016 }, exposicion: 0.5, intensidadEntorno: 0.6, colorSueloEntorno: 0x4b5a35,
    sombra: { centro: new THREE.Vector3(0, 0, 0), radio: 55 },
  });
  domoBruma(scene, { color: 0xc6d2dc, altura: 0.1, opacidad: 0.55 });

  const gt = TX.grass().clone(); gt.repeat.set(80, 80); gt.needsUpdate = true;
  scene.add(suelo({ ancho: 1400, fondo: 1400, material: M.variacionMacro(new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95 }), 0.02, 0.5) }));
  // patio de hormigón del almacén
  const patio = suelo({ ancho: 90, fondo: 48, rep: 9 }); patio.position.set(0, 0.03, 4); scene.add(patio);
  scene.add(colinas({ radio: 800, alto: 80, seed: 11, color: 0x6d7a55 }));

  // Almacén del comprador
  const almacen = nave({ ancho: 72, fondo: 40, alto: 12, color: 0xd9dcdf, puertas: 6, abierta: 2, rotulo: 'ILUMINACIONES MESETA', colorRotulo: '#12233d' });
  almacen.position.set(0, 0, -36); scene.add(almacen);
  const dock = almacen.userData.docks[2].clone().add(almacen.position); // punto de atraque (mundo)

  // Carreteras
  scene.add(carretera({ largo: 900, ancho: 9, z: 42 }));
  const acceso = carretera({ largo: 18, ancho: 8, x: -24, z: 34, ry: Math.PI / 2 }); scene.add(acceso);
  scene.add(valla([new THREE.Vector3(-45, 0, 28), new THREE.Vector3(-29, 0, 28)]));
  scene.add(valla([new THREE.Vector3(-19, 0, 28), new THREE.Vector3(45, 0, 28)]));
  scene.add(farolas([{ x: -40, z: 24 }, { x: 40, z: 24 }, { x: 0, z: 24 }], { alto: 11 }));
  const tp = [];
  for (let i = 0; i < 40; i++) tp.push({ x: -300 + i * 15 + (i % 4) * 3, z: 52 + (i % 3) * 4, s: 0.9 + (i % 4) * 0.15 });
  for (let i = 0; i < 14; i++) tp.push({ x: -60 - (i % 2) * 6, z: -50 + i * 6, s: 1.1 });
  for (let i = 0; i < 14; i++) tp.push({ x: 60 + (i % 2) * 6, z: -50 + i * 6, s: 1.0 });
  scene.add(arboles(tp, { seed: 7 }));
  // palés ya descargados dentro/ junto al muelle
  const pal = []; for (let i = 0; i < 6; i++) pal.push({ x: dock.x - 8 + (i % 3) * 1.4, z: dock.z + 4 + Math.floor(i / 3) * 1.3 });
  scene.add(makePallets(pal));

  // Otro camión atracado y contenedores vacíos pendientes de devolución
  const t3 = makeTruck({ color: 0xf2f2ee, franja: 0x2d6a4c, colorCont: 0x2d6a4c, marca: 'NORTRANS', codigo: 'NTRU 330918 2' });
  t3.rotation.y = -Math.PI / 2; t3.position.set(almacen.userData.docks[4].x, 0, -9.1); scene.add(t3);
  scene.add(makeYard([
    { x: 34, y: 0, z: 8, ry: Math.PI / 2, marca: 0, tono: 0.4 }, { x: 36.6, y: 0, z: 8, ry: Math.PI / 2, marca: 3, tono: 0.7 }, { x: 34, y: DIM.H, z: 8, ry: Math.PI / 2, marca: 4, tono: 0.5 },
  ]));

  // Camión: recorrido por la carretera, giro y marcha atrás al muelle
  const truck = makeTruck({ color: 0x1d3f6e, franja: 0xd9622b, colorCont: 0x1f4573, marca: 'OCEANIS' });
  scene.add(truck);
  const cont = truck.userData.contenedor;
  const humo = new Emisor({ max: Math.round(100 * q.particulas) || 20, tasa: 12 * q.particulas + 2, vida: 2.4, origen: truck.userData.exhaust, vel: new THREE.Vector3(0, 1.5, 0), dispersion: 0.5, tamIni: 0.35, tamFin: 2.2, alfa: 0.2, color: 0x8d9095, viento: new THREE.Vector3(0.8, 0.2, -0.4) });
  scene.add(humo.points);

  // Trayectoria (centro del conjunto). Fase 1: avanza hacia +x por la carretera; fase 2: maniobra
  const ruta = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-72, 0, 40), new THREE.Vector3(-58, 0, 40), new THREE.Vector3(-60, 0, 40), new THREE.Vector3(-36, 0, 40),
    new THREE.Vector3(-26, 0, 34), new THREE.Vector3(-20, 0, 24), new THREE.Vector3(-12, 0, 14), new THREE.Vector3(0, 0, 10), new THREE.Vector3(14, 0, 12),
  ]);
  const marchaAtras = new THREE.CatmullRomCurve3([
    new THREE.Vector3(14, 0, 12), new THREE.Vector3(6, 0, 4), new THREE.Vector3(dock.x, 0, dock.z + 16), new THREE.Vector3(dock.x, 0, dock.z + 6.9),
  ]);
  const L1 = ruta.getLength(), L2 = marchaAtras.getLength();
  const T1 = 11, T2 = 9;
  let t0 = 0;
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  let ultimo = new THREE.Vector3();
  const colocar = (tt) => {
    let atras = false, p, tg;
    if (tt < T1) {
      const k = THREE.MathUtils.smoothstep(tt / T1, 0, 1) * 0.6 + (tt / T1) * 0.4;
      p = ruta.getPointAt(Math.min(1, k), tmp); tg = ruta.getTangentAt(Math.min(1, k), tan);
    } else {
      const k = Math.min(1, THREE.MathUtils.smootherstep((tt - T1) / T2, 0, 1));
      p = marchaAtras.getPointAt(k, tmp); tg = marchaAtras.getTangentAt(k, tan).negate(); atras = true;
    }
    truck.position.copy(p);
    truck.rotation.y = Math.atan2(-tg.z, tg.x);
    const d = ultimo.distanceTo(p); truck.userData.rodar(atras ? -d : d); ultimo.copy(p);
    cont.userData.setPuertas(THREE.MathUtils.clamp((tt - T1 - T2 - 0.5) / 2.5, 0, 1));
  };

  const anclas = {};
  const mk = (p, parent = scene) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); return o; };
  anclas['transporte-final'] = mk(new THREE.Vector3(8.5, 5, 0), truck);
  anclas['descarga'] = mk(new THREE.Vector3(dock.x + 4.5, 5.2, dock.z + 1.5));
  anclas['libre-circulacion'] = mk(new THREE.Vector3(-8, 11.5, -15.5));

  return {
    id: 'entrega', scene,
    post: { ao: true, bloom: 0.18, umbral: 0.95, aoRadio: 0.8 },
    emisores: [humo],
    camara: {
      intro: { pos: new THREE.Vector3(-150, 70, 140), target: new THREE.Vector3(-20, 4, 10) },
      main: { pos: new THREE.Vector3(40, 26, 80), target: new THREE.Vector3(-34, 2, 12) },
      distEnfoque: 34,
    },
    limites: { minDist: 6, maxDist: 160, maxPolar: 1.45, rangoAzim: 1.6, caja: new THREE.Box3(new THREE.Vector3(-90, 0, -40), new THREE.Vector3(90, 30, 60)) },
    anclas,
    update(dt, t) {
      env.update(t);
      t0 += dt; colocar(Math.min(t0, T1 + T2 + 4));
      humo.update(dt);
    },
    onEntrar() { t0 = 0; ultimo.copy(ruta.getPointAt(0)); colocar(0); },
  };
}
