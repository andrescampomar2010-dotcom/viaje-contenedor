/* =====================================================================
 *  ESCENA 1 · OFICINA Y ACUERDO COMERCIAL — tarde, luz cálida de ventana
 * ===================================================================== */
import * as THREE from 'three';
import { entornoInterior, luzSombra } from '../core/environment.js';
import { polvo } from '../core/effects.js';
import { makeOficina, makeDocumento } from '../builders/office.js';

export async function construir({ renderer, q }) {
  const scene = new THREE.Scene();
  entornoInterior(scene, renderer, { intensidad: 0.32, fondo: 0x1a1612 });
  scene.userData.exposicion = 1.12;
  scene.fog = new THREE.Fog(0x1a1612, 8, 18);

  const of = makeOficina({ q });
  scene.add(of);

  // Sol de tarde entrando por el ventanal (proyecta los montantes)
  luzSombra(scene, q, { color: 0xffc58a, intensidad: 4.0, pos: new THREE.Vector3(14, 6.2, 2.6), objetivo: new THREE.Vector3(0, 0.75, 0.2), radio: 4.5, bias: -0.0002 });
  scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x5a4634, 0.35));
  const flexo = new THREE.PointLight(0xffd6a0, 1.2, 3.5, 2); flexo.position.set(-0.85, 1.2, 0.0); scene.add(flexo);
  const relleno = new THREE.PointLight(0xbfd2ff, 0.6, 9, 2); relleno.position.set(-2.5, 2.6, 2.5); scene.add(relleno);

  // Documentos
  const contrato = makeDocumento('contrato', 2.0);
  contrato.position.set(-0.2, 0.779, 0.07); contrato.rotation.z = 0.04; scene.add(contrato);
  const proforma = makeDocumento('proforma', 1.7);
  proforma.position.set(0.31, 0.781, 0.1); proforma.rotation.z = -0.12; scene.add(proforma);
  scene.updateMatrixWorld(true);

  const anclas = {
    incoterm: contrato.userData.anclaZona('incoterm'),
    pago: contrato.userData.anclaZona('pago'),
    seguro: contrato.userData.anclaZona('seguro'),
    transporte: contrato.userData.anclaZona('transporte'),
    precio: proforma.userData.anclaZona('precio'),
  };

  const motas = polvo({ n: Math.round(420 * q.particulas), caja: new THREE.Vector3(4.5, 1.8, 2.2), centro: new THREE.Vector3(2.0, 1.35, 0.8), tam: 0.012 });
  scene.add(motas);

  return {
    id: 'oficina', scene,
    post: { ao: true, bloom: 0.22, umbral: 0.95, aoRadio: 0.12 },
    camara: {
      intro: { pos: new THREE.Vector3(2.6, 2.3, 3.0), target: new THREE.Vector3(0.2, 0.9, 0) },
      main: { pos: new THREE.Vector3(-0.1, 1.56, 0.66), target: new THREE.Vector3(-0.1, 0.78, 0.09) },
      distEnfoque: 0.5,
    },
    limites: { minDist: 0.3, maxDist: 3.2, maxPolar: 1.3, rangoAzim: 1.1, caja: new THREE.Box3(new THREE.Vector3(-2, 0.6, -1.6), new THREE.Vector3(2, 1.4, 1.6)) },
    anclas,
    update(dt, t) { motas.userData.update(t); },
    onHotspot(id) {
      contrato.userData.resaltar(id === 'precio' ? null : id);
      proforma.userData.resaltar(id === 'precio' ? 'precio' : null);
    },
    onCerrar() { contrato.userData.resaltar(null); proforma.userData.resaltar(null); },
    onIncoterm(i) {
      contrato.userData.setIncoterm(i);
      for (const id of ['incoterm', 'pago', 'seguro', 'transporte']) { const p = contrato.userData.posZona(id); if (p) anclas[id].position.copy(p); }
    },
  };
}
