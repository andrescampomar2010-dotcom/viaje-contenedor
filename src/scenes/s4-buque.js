/* =====================================================================
 *  ESCENA 4 · BUQUE EN ALTA MAR — atardecer. Mar con shader de reflejos,
 *  estela de espuma, humo de chimenea y balanceo suave.
 * ===================================================================== */
import * as THREE from 'three';
import { cieloExterior, domoBruma } from '../core/environment.js';
import { mar, estela, Emisor } from '../core/effects.js';
import { makeShip } from '../builders/ship.js';

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  const env = cieloExterior(scene, renderer, q, {
    elev: 5, azim: 232, turbidez: 7, rayleigh: 2.6, mie: 0.006, mieG: 0.86, nubes: 0.42, densidadNubes: 0.45, alturaNubes: 0.45,
    colorSol: 0xffb877, intensidadSol: 3.6, intensidadHemi: 0.45, cieloHemi: 0xf0c4a0, sueloHemi: 0x1d2a3a,
    niebla: { color: 0xc99a7a, densidad: 0.00055 }, exposicion: 0.42, intensidadEntorno: 0.7, colorSueloEntorno: 0x1a2a3a,
    sombra: { centro: new THREE.Vector3(0, 10, 0), radio: 100, bias: -0.0008, normalBias: 0.15 },
  });
  domoBruma(scene, { color: 0xc99a7a, altura: 0.08, opacidad: 0.6 });

  const water = mar({ tam: 9000, q, sunDir: env.sunDir, colorAgua: 0x0a2a3e, colorSol: 0xffcf9a, distorsion: 3.6 });
  scene.add(water);

  const ship = makeShip({ L: 176, B: 30, densidad: q.densidad, luces: true });
  const pivot = new THREE.Group(); pivot.add(ship); scene.add(pivot);
  const wake = estela({ largo: 320, ancho: 46, x0: -88 }); scene.add(wake);

  const humo = new Emisor({ max: Math.round(220 * q.particulas) || 40, tasa: 14 * q.particulas + 3, vida: 9, origen: ship.userData.humo, vel: new THREE.Vector3(-6, 4, 0), dispersion: 1.6, tamIni: 3, tamFin: 22, alfa: 0.16, color: 0x6a6460, viento: new THREE.Vector3(-1.2, 0.15, 0.5) });
  scene.add(humo.points);
  const spray = new Emisor({ max: Math.round(160 * q.particulas) || 30, tasa: 30 * q.particulas + 4, vida: 1.6, origen: new THREE.Vector3(90, 1, 0), caja: new THREE.Vector3(6, 0.5, 26), vel: new THREE.Vector3(-4, 3.2, 0), dispersion: 2.5, tamIni: 0.8, tamFin: 4, alfa: 0.3, color: 0xf3f6f8, viento: new THREE.Vector3(-4, 0, 0), gravedad: 4 });
  scene.add(spray.points);

  const anclas = {};
  const mk = (p, parent = ship) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); return o; };
  const sx = -176 / 2 + 26, top = ship.userData.top;
  anclas['flete'] = mk(new THREE.Vector3(10, top - 3, -15.3));
  anclas['recargos'] = mk(new THREE.Vector3(sx - 11, top + 18.5, 0));
  anclas['seguro-mar'] = mk(new THREE.Vector3(40, top + 17, 0));
  anclas['bl'] = mk(new THREE.Vector3(sx + 6, top + 27.5, -12));

  return {
    id: 'buque', scene,
    post: { ao: false, bloom: 0.36, umbral: 0.88, radioBloom: 0.6 },
    emisores: [humo, spray],
    camara: {
      intro: { pos: new THREE.Vector3(380, 80, -280), target: new THREE.Vector3(0, 12, 0) },
      main: { pos: new THREE.Vector3(124, 30, -112), target: new THREE.Vector3(8, 12, 2) },
      distEnfoque: 55,
    },
    limites: { minDist: 25, maxDist: 420, maxPolar: 1.5, minPolar: 0.2, caja: new THREE.Box3(new THREE.Vector3(-120, 0, -60), new THREE.Vector3(120, 50, 60)) },
    anclas,
    update(dt, t) {
      env.update(t);
      water.userData.update(t, 1.6);
      wake.userData.update(t);
      pivot.rotation.x = Math.sin(t * 0.42) * 0.012;
      pivot.rotation.z = Math.sin(t * 0.27 + 1) * 0.006;
      pivot.position.y = Math.sin(t * 0.5) * 0.25;
      humo.update(dt); spray.update(dt);
    },
  };
}
