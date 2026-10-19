/* =====================================================================
 *  ESCENA 2 · ALMACÉN DE ORIGEN — mañana. Carga con carretilla por rampa
 *  móvil, precintado y salida del camión hacia el puerto.
 * ===================================================================== */
import * as THREE from 'three';
import { cieloExterior, domoBruma } from '../core/environment.js';
import { Emisor } from '../core/effects.js';
import * as M from '../core/materials.js';
import * as TX from '../core/textures.js';
import { makeTruck, makeForklift, makePallet, makePallets } from '../builders/vehicles.js';
import { suelo, nave, farolas, valla, arboles, carretera, colinas, edificio } from '../builders/port.js';
import { DIM, makeYard } from '../builders/container.js';

const lerp = THREE.MathUtils.lerp;

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  const env = cieloExterior(scene, renderer, q, {
    elev: 16, azim: 115, turbidez: 5, rayleigh: 1.8, mie: 0.006, nubes: 0.3,
    colorSol: 0xffd2a6, intensidadSol: 4.2, intensidadHemi: 0.3, cieloHemi: 0xc9dbf0, sueloHemi: 0x7a6a58,
    niebla: { color: 0xb8c4cf, densidad: 0.0022 }, exposicion: 0.52, intensidadEntorno: 0.38,
    sombra: { centro: new THREE.Vector3(-2, 0, 8), radio: 30 },
  });
  domoBruma(scene, { color: 0xb8c4cf, altura: 0.12, opacidad: 0.6 });

  scene.add(suelo({ ancho: 600, fondo: 600, rep: 60 }));
  scene.add(colinas({ radio: 700, alto: 70, seed: 2, color: 0x6e7b6a }));

  // Nave del vendedor (fachada en z = -2)
  const n = nave({ ancho: 70, fondo: 36, alto: 12, color: 0xc4c9ce, puertas: 5, abierta: 2, rotulo: 'BRIGHTWAVE LIGHTING', colorRotulo: '#12233d' });
  n.position.set(0, 0, -20); scene.add(n);
  const n2 = edificio({ ancho: 22, fondo: 12, plantas: 3, color: 0xdedbd2, luces: 0.25, rotulo: 'BRIGHTWAVE · OFICINAS', seed: 8 });
  n2.position.set(52, 0, -10); n2.rotation.y = -0.2; scene.add(n2);
  scene.add(carretera({ largo: 600, ancho: 9, z: 34 }));
  scene.add(farolas([{ x: -30, z: 14 }, { x: 25, z: 14 }, { x: -5, z: 28 }], { alto: 12 }));
  scene.add(valla([new THREE.Vector3(-60, 0, 29), new THREE.Vector3(-8, 0, 29)]));
  scene.add(valla([new THREE.Vector3(8, 0, 29), new THREE.Vector3(60, 0, 29)]));
  const tp = []; for (let i = 0; i < 26; i++) tp.push({ x: -150 + i * 12 + (i % 3) * 2, z: 44 + (i % 4) * 3, s: 0.9 + (i % 3) * 0.2 });
  scene.add(arboles(tp, { seed: 3 }));

  // Camión con contenedor junto a rampa móvil (trasera hacia la nave)
  const truck = makeTruck({ color: 0xf2f2ee, franja: 0xd9622b, colorCont: 0x1f4573, marca: 'OCEANIS' });
  truck.rotation.y = -Math.PI / 2; // +x local → +z mundo
  truck.position.set(0, 0, 12.6); // trasera ≈ z 6.2
  scene.add(truck);
  const cont = truck.userData.contenedor;
  cont.userData.setPuertas(1);
  const sueloCont = 1.32 + 0.15; // altura del piso del contenedor

  // Otro camión atracado en un muelle y contenedores vacíos apilados
  const t3 = makeTruck({ color: 0xc9cdd2, franja: 0x2d6a4c, colorCont: 0x8a3324, marca: 'KAIYO', codigo: 'KYOU 771045 0' });
  t3.rotation.y = -Math.PI / 2; t3.position.set(23.3, 0, 8.6); scene.add(t3);
  scene.add(makeYard([
    { x: 36, y: 0, z: 14, ry: Math.PI / 2, marca: 4, tono: 0.3 }, { x: 38.6, y: 0, z: 14, ry: Math.PI / 2, marca: 1, tono: 0.6 },
    { x: 36, y: DIM.H, z: 14, ry: Math.PI / 2, marca: 2, tono: 0.5 }, { x: 41.2, y: 0, z: 14, ry: Math.PI / 2, marca: 5, tono: 0.2 },
  ]));

  // Rampa móvil
  const rampa = new THREE.Group(); scene.add(rampa);
  const rampLen = 9, z0 = 6.2 - rampLen, z1 = 6.2;
  const angle = Math.atan2(sueloCont, rampLen);
  const rm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, Math.hypot(rampLen, sueloCont)), M.acero(0x5e6369, 0.5, 0.8));
  rm.position.set(0, sueloCont / 2, (z0 + z1) / 2); rm.rotation.x = angle; rm.castShadow = true; rm.receiveShadow = true; rampa.add(rm);
  for (const s of [1, -1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, Math.hypot(rampLen, sueloCont)), M.pintura(0xe2b019, 0.5, 0.3)); rail.position.set(s * 1.12, sueloCont / 2 + 0.3, (z0 + z1) / 2); rail.rotation.x = angle; rail.castShadow = true; rampa.add(rail); }
  const legs = new THREE.Mesh(new THREE.BoxGeometry(2.0, sueloCont - 0.2, 0.2), M.acero(0x3b3f45, 0.5, 0.7)); legs.position.set(0, (sueloCont - 0.2) / 2, z1 - 1.2); rampa.add(legs);

  // Palés preparados
  const pal = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) pal.push({ x: -14.2 + i * 1.5, z: -0.5 + j * 1.25, ry: 0 });
  for (let i = 0; i < 4; i++) pal.push({ x: -14.2 + i * 1.5, y: 1.33, z: 0.75, ry: 0 });
  for (let i = 0; i < 8; i++) pal.push({ x: 8 + i * 1.4, z: -0.6, ry: 0 });
  for (let i = 0; i < 5; i++) pal.push({ x: 8.7 + i * 1.4, y: 1.33, z: -0.6, ry: 0 });
  scene.add(makePallets(pal));
  const cinta = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 0.12), M.pintura(0xe2b019, 0.7, 0)); cinta.rotation.x = -Math.PI / 2; cinta.position.set(-11.95, 0.02, -1.6); scene.add(cinta);

  // Carretilla con palé — recorrido en bucle
  const fl = makeForklift(); scene.add(fl);
  const palet = makePallet(); fl.userData.cargo.add(palet); palet.position.set(-0.05, 0, 0);
  // fotogramas clave: [t, x, z, yaw (dirección en mundo), y, carga, elevación]
  const yawZ = 0; // carretilla mira hacia +x local; yaw = rotación y
  const K = [
    [0, -6.6, 1.3, Math.PI, 0, 1, 0.12],
    [2.5, -4.0, 1.3, Math.PI, 0, 1, 0.12],   // marcha atrás saliendo del montón
    [5, -1.6, -2.4, Math.PI / 2 + 0.0, 0, 1, 0.12],
    [6.2, 0, -3.6, -Math.PI / 2, 0, 1, 0.15],
    [9.5, 0, z1 - 0.3, -Math.PI / 2, sueloCont, 1, 0.15], // sube la rampa
    [12.5, 0, 12.5, -Math.PI / 2, sueloCont, 1, 0.12],   // dentro del contenedor
    [13.5, 0, 12.5, -Math.PI / 2, sueloCont, 0, 0.02],   // deja el palé
    [16.5, 0, z1 - 0.3, -Math.PI / 2, sueloCont, 0, 0.02], // sale marcha atrás
    [19.5, 0, -3.6, -Math.PI / 2, 0, 0, 0.02],
    [21.5, -2.4, -2.0, Math.PI * 0.85, 0, 0, 0.02],
    [24, -6.6, 1.3, Math.PI, 0, 0, 0.02],
    [25, -6.6, 1.3, Math.PI, 0, 1, 0.12],
  ];
  const PER = 25;
  // la orientación de la carretilla: su +x local es la dirección de las horquillas
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  let lastPos = new THREE.Vector3();
  const animFL = (t) => {
    const u = t % PER;
    let i = 0; while (i < K.length - 2 && K[i + 1][0] <= u) i++;
    const a = K[i], b = K[i + 1];
    const k = THREE.MathUtils.smoothstep((u - a[0]) / (b[0] - a[0]), 0, 1);
    const x = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k);
    // altura sobre la rampa
    let y = 0;
    if (z > z0 && z < z1 && Math.abs(x) < 1.2) y = ((z - z0) / rampLen) * sueloCont; else if (z >= z1 && Math.abs(x) < 1.3) y = sueloCont;
    fl.position.set(x, y, z);
    // orientación y cabeceo en la rampa (la carretilla mira a +z al subir y al bajar marcha atrás)
    fl.rotation.set(0, a[3] + angDiff(a[3], b[3]) * k, (z > z0 && z < z1 && Math.abs(x) < 1.2) ? angle : 0);
    fl.userData.setLift(lerp(a[6], b[6], k));
    palet.visible = (u < 13.0) || u > 24.5;
    const d = lastPos.distanceTo(fl.position); fl.userData.rodar(d); lastPos.copy(fl.position);
  };
  // palé "dentro" del contenedor (aparece tras dejarlo)
  const dentro = makePallet({ film: true }); dentro.position.set(0, sueloCont, 13.4); scene.add(dentro);

  // Camión que sale hacia el puerto por la carretera
  const truck2 = makeTruck({ color: 0x1d3f6e, franja: 0xd9622b, colorCont: 0xc9592a, marca: 'MAREVAL', codigo: 'MRVU 551208 4' });
  truck2.position.set(-200, 0, 32); scene.add(truck2);
  const humo = new Emisor({ max: Math.round(120 * q.particulas) || 20, tasa: 14 * q.particulas + 2, vida: 2.6, origen: truck2.userData.exhaust, vel: new THREE.Vector3(0, 1.6, 0), dispersion: 0.5, tamIni: 0.35, tamFin: 2.4, alfa: 0.22, color: 0x8d9095, viento: new THREE.Vector3(-1.5, 0.2, 0.3) });
  scene.add(humo.points);

  // Anclas de hotspots
  const anclas = {};
  const mk = (p, parent = scene) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); return o; };
  anclas['embalaje'] = mk(new THREE.Vector3(-12, 3.2, 0.6));
  anclas['carga'] = mk(new THREE.Vector3(0, 2.8, 0), fl);
  anclas['precinto'] = mk(new THREE.Vector3(0.5, 2.0, 6.0));
  anclas['transporte-puerto'] = mk(new THREE.Vector3(4, 5.2, 32.5));

  let tTruck = 0;
  return {
    id: 'fabrica', scene,
    post: { ao: true, bloom: 0.2, umbral: 0.95, aoRadio: 0.8 },
    emisores: [humo],
    camara: {
      intro: { pos: new THREE.Vector3(-70, 42, 85), target: new THREE.Vector3(0, 3, 0) },
      main: { pos: new THREE.Vector3(-36, 17, 52), target: new THREE.Vector3(-1, 2, 13) },
      distEnfoque: 11,
    },
    limites: { minDist: 4, maxDist: 70, maxPolar: 1.42, rangoAzim: 1.5, caja: new THREE.Box3(new THREE.Vector3(-40, 0, -15), new THREE.Vector3(40, 12, 40)) },
    anclas,
    update(dt, t) {
      env.update(t);
      animFL(t);
      dentro.visible = (t % PER) > 13.2 && (t % PER) < 24.0;
      tTruck = (tTruck + dt) % 46;
      const x = -160 + tTruck * 9;
      const prev = truck2.position.x; truck2.position.x = x; truck2.userData.rodar(Math.max(0, x - prev));
      humo.update(dt);
    },
  };
}
