/* =====================================================================
 *  MODELOS glTF/GLB OPCIONALES — GLTFLoader con Draco y meshopt.
 *  Añade modelos CC0 propios desde DATA.modelosExtra (ver data.js).
 * ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

let loader = null;
function getLoader() {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath('./src/vendor/three/addons/libs/draco/gltf/');
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

/**
 * Carga los modelos declarados y los coloca en sus escenas.
 * lista: [{ escena: 'fabrica', url: 'assets/models/x.glb', pos:[x,y,z], rotY: 0, escala: 1, sombras: true }]
 */
export async function cargarModelosExtra(lista, escenasPorId, alProgreso) {
  if (!lista?.length) return;
  const l = getLoader();
  let i = 0;
  for (const m of lista) {
    const destino = escenasPorId[m.escena];
    if (!destino) continue;
    try {
      const gltf = await l.loadAsync(m.url);
      const obj = gltf.scene;
      obj.position.fromArray(m.pos || [0, 0, 0]);
      obj.rotation.y = m.rotY || 0;
      obj.scale.setScalar(m.escala || 1);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = m.sombras !== false; o.receiveShadow = true; } });
      destino.scene.add(obj);
    } catch (e) {
      console.warn(`Modelo opcional no cargado (${m.url}): ${e.message}`);
    }
    alProgreso && alProgreso(++i / lista.length);
  }
}
