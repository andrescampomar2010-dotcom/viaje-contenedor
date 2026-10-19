/* =====================================================================
 *  EL VIAJE DE UN CONTENEDOR — orquestador
 *  Carga, calidad, escenas, transiciones de cámara, interacción y bucle.
 *
 *  Módulos:
 *   · data.js            → datos editables (importes, textos, Incoterms)
 *   · logic/costs.js     → cálculo de costes, valor en aduana, arancel, IVA
 *   · core/*             → render, postprocesado, cámara, texturas, efectos
 *   · builders/*         → modelos procedurales (contenedor, grúa, buque…)
 *   · scenes/*           → las 7 escenas
 *   · ui/*               → hotspots, paneles, resumen
 * ===================================================================== */
import * as THREE from 'three';
import { DATA } from './data.js';
import { calcular } from './logic/costs.js';
import { PERFILES, detectarCalidad, MedidorFPS } from './core/quality.js';
import { crearRenderer, Post } from './core/renderer.js';
import { CameraRig } from './core/cameraRig.js';
import { setAnisotropy } from './core/textures.js';
import { Hotspots } from './ui/hotspots.js';
import * as UI from './ui/panels.js';
import { fmtEUR } from './logic/costs.js';
import { cargarModelosExtra } from './core/models.js';

import * as S1 from './scenes/s1-oficina.js';
import * as S2 from './scenes/s2-fabrica.js';
import * as S3 from './scenes/s3-terminal-origen.js';
import * as S4 from './scenes/s4-buque.js';
import * as S5 from './scenes/s5-terminal-destino.js';
import * as S6 from './scenes/s6-aduana.js';
import * as S7 from './scenes/s7-entrega.js';

const MODULOS = [S1, S2, S3, S4, S5, S6, S7];
const $ = (id) => document.getElementById(id);
const espera = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ---------- Estado ---------- */
const estado = {
  escena: 0, incoterm: DATA.incotermInicial, canal: DATA.canalInicial,
  pausa: false, libre: false, abierto: null, incluirIVA: true, resumen: false,
  calidadModo: new URLSearchParams(location.search).get('calidad') || localStorage.getItem('vdc-calidad') || 'auto',
};
if (!['auto', 'alta', 'media', 'baja'].includes(estado.calidadModo)) estado.calidadModo = 'auto';
let calc = calcular(estado);

/* ---------- Render ---------- */
const canvas = $('lienzo');
let renderer;
try { renderer = crearRenderer(canvas); } catch (e) { fallo('Este navegador no puede iniciar WebGL. Prueba con Chrome, Edge, Firefox o Safari actualizados.'); throw e; }
const deteccion = detectarCalidad(renderer);
let q = PERFILES[estado.calidadModo === 'auto' ? deteccion.id : estado.calidadModo];
setAnisotropy(Math.min(q.anisotropia, renderer.capabilities.getMaxAnisotropy()));
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 12000);
const post = new Post(renderer, camera);
const rig = new CameraRig(camera, canvas);
const hs = new Hotspots($('hotspots'), $('tooltip'));
const medidor = new MedidorFPS();
const escenas = [];
let activa = null, tEscena = 0, ultimoFrame = performance.now(), listo = false;

function fallo(msg) { $('cargaEstado').textContent = msg; $('cargaBarra').style.width = '0'; }

/* ---------- Carga ---------- */
async function cargar() {
  const progreso = (k, txt) => { $('cargaBarra').style.width = `${Math.round(k * 100)}%`; $('cargaEstado').textContent = txt; };
  progreso(0.03, 'Cargando tipografías…');
  try { await Promise.all(['400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter', '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))); } catch (e) { /* usa fuentes del sistema */ }
  renderer.setSize(innerWidth, innerHeight, false);
  post.construir(q);
  const ctx = { renderer, q, camera };
  for (let i = 0; i < MODULOS.length; i++) {
    progreso(0.06 + (i / MODULOS.length) * 0.86, `Construyendo escena ${i + 1}/7 · ${DATA.fases[i].nombre}…`);
    await espera(16);
    const s = await MODULOS[i].construir(ctx);
    s.fase = DATA.fases[i];
    escenas.push(s);
    // precompila shaders para evitar tirones al cambiar de escena
    try {
      // compila con el mismo destino que usará el postprocesado (sin tone mapping en el RT)
      renderer.setRenderTarget(post.composer.readBuffer);
      if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(s.scene, camera);
      else renderer.compile(s.scene, camera);
      renderer.setRenderTarget(null);
    } catch (e) { renderer.setRenderTarget(null); }
    s.emisores?.forEach((em) => em.precalentar(4));
  }
  if (DATA.modelosExtra?.length) {
    progreso(0.93, 'Cargando modelos glTF…');
    await cargarModelosExtra(DATA.modelosExtra, Object.fromEntries(escenas.map((s) => [s.id, s])));
  }
  escenas.forEach((s) => s.onCalculo?.(calc));
  progreso(1, `Listo · calidad ${q.nombre}${estado.calidadModo === 'auto' ? ` (${deteccion.motivo === 'parámetro de URL' ? 'fijada por URL' : 'detectada: ' + deteccion.motivo})` : ''}`);
  listo = true;
  irA(0, { instantaneo: true });
  const b = $('btnEmpezar'); b.hidden = false; b.focus();
  if (new URLSearchParams(location.search).has('auto')) empezar();
}
function empezar() {
  $('carga').classList.add('fuera');
  setTimeout(() => ($('carga').hidden = true), 700);
  irA(estado.escena, { reiniciarVuelo: true });
}

/* ---------- Navegación entre escenas ---------- */
let transicion = false;
async function irA(i, { instantaneo = false, reiniciarVuelo = false } = {}) {
  if (!listo || transicion) return;
  i = Math.max(0, Math.min(7, i));
  cerrarDetalle(false);
  if (i === 7) { mostrarResumen(true); estado.escena = 7; UI.renderPasos(7); UI.renderCostes(calc, 7, estado.incluirIVA); return; }
  mostrarResumen(false);
  const cambio = !activa || escenas[i] !== activa;
  if (cambio && !instantaneo) { transicion = true; $('fundido').classList.add('on'); await espera(360); }
  estado.escena = i;
  activa = escenas[i];
  post.setScene(activa.scene, activa.post);
  const s = activa;
  // límites de órbita relativos al plano principal
  const m = plano(s.camara.main);
  const off = m.pos.clone().sub(m.target);
  const az = Math.atan2(off.x, off.z);
  const lim = { ...s.limites, maxDist: (s.limites.maxDist || 60) * factorAspecto() };
  if (s.limites.rangoAzim) { lim.minAzim = az - s.limites.rangoAzim; lim.maxAzim = az + s.limites.rangoAzim; }
  rig.setLimites(lim);
  if (cambio || reiniciarVuelo) {
    tEscena = 0;
    s.onEntrar?.();
    const intro = plano(s.camara.intro);
    rig.saltar(intro.pos, intro.target);
    if (!instantaneo) rig.volar(m.pos, m.target, { dur: 2.6, arco: 0.1 });
  }
  hs.set(DATA.hotspots[s.id].map((h) => ({ ...h, resumen: resumenHotspot(h) })), s.anclas, { onAbrir: abrirDetalle, faseId: s.id });
  UI.renderPasos(i);
  UI.renderCostes(calc, i + 1, estado.incluirIVA);
  emitirEscala();
  if (cambio && !instantaneo) { await espera(60); $('fundido').classList.remove('on'); }
  transicion = false;
}
/** En pantallas verticales aleja la cámara para que el encuadre horizontal quepa. */
function factorAspecto() { const a = innerWidth / innerHeight; return a >= 1.3 ? 1 : Math.min(2.3, 1.3 / a); }
function plano(shot) { const k = factorAspecto(); return { pos: shot.target.clone().add(shot.pos.clone().sub(shot.target).multiplyScalar(k)), target: shot.target }; }
function resumenHotspot(h) {
  if (!h.costes?.length) return h.tipo === 'incoterm' ? `Ahora: ${estado.incoterm}` : '';
  const t = h.costes.reduce((s, k) => s + calc.items[k].importe, 0);
  return fmtEUR(t);
}

/* ---------- Detalle de hotspot ---------- */
function abrirDetalle(id) {
  const s = activa; if (!s) return;
  const h = DATA.hotspots[s.id].find((x) => x.id === id); if (!h) return;
  estado.abierto = id;
  $('detFase').textContent = `Fase ${s.fase.n} · ${s.fase.nombre}`;
  $('detTitulo').textContent = h.titulo;
  $('detCuerpo').innerHTML = UI.contenidoDetalle(h, calc, estado);
  $('detalle').hidden = false;
  hs.marcarVisto(id); hs.setActivo(id);
  objetivoOffset();
  s.onHotspot?.(id);
  // vuelo de cámara hacia el punto
  const a = s.anclas[id];
  if (a && !estado.libre) {
    const p = a.getWorldPosition(new THREE.Vector3());
    // se acerca por la línea de visión desde el plano general (el punto ya era visible desde ahí)
    const dist = (s.camara.distEnfoque || 10) * factorAspecto();
    const mainP = plano(s.camara.main).pos;
    const dir = mainP.clone().sub(p);
    const pos = dir.length() > dist ? p.clone().add(dir.normalize().multiplyScalar(dist)) : mainP.clone();
    pos.y = Math.max(pos.y, p.y + dist * 0.15, 0.4);
    rig.volar(pos, p, { dur: 1.5, arco: 0.06 });
  }
  $('detCerrar').focus({ preventScroll: true });
}
function cerrarDetalle(volver = true) {
  if (!estado.abierto) return;
  const id = estado.abierto;
  estado.abierto = null;
  $('detalle').hidden = true;
  hs.setActivo(null);
  objetivoOffset();
  activa?.onCerrar?.();
  if (volver && activa && !estado.libre) { const m = plano(activa.camara.main); rig.volar(m.pos, m.target, { dur: 1.4, arco: 0.05 }); }
  if (volver) hs.enfocar(id);
}
function siguienteHotspot() {
  const ids = hs.ids(); if (!ids.length) return;
  const i = ids.indexOf(estado.abierto);
  if (i >= 0 && i === ids.length - 1) { cerrarDetalle(false); irA(estado.escena + 1); return; }
  abrirDetalle(ids[(i + 1) % ids.length]);
}
function refrescarDetalle() {
  if (!estado.abierto || !activa) return;
  const h = DATA.hotspots[activa.id].find((x) => x.id === estado.abierto);
  $('detCuerpo').innerHTML = UI.contenidoDetalle(h, calc, estado);
}

/* ---------- Cambios de estado ---------- */
function setIncoterm(k) {
  estado.incoterm = k; calc = calcular(estado);
  UI.renderIncoterm($('incotermBar'), k);
  escenas.forEach((s) => { s.onIncoterm?.(k); s.onCalculo?.(calc); });
  UI.renderCostes(calc, Math.min(7, estado.escena + 1), estado.incluirIVA);
  refrescarDetalle();
  if (activa) hs.set(DATA.hotspots[activa.id].map((h) => ({ ...h, resumen: resumenHotspot(h) })), activa.anclas, { onAbrir: abrirDetalle, faseId: activa.id });
  if (estado.abierto) hs.setActivo(estado.abierto);
  if (estado.resumen) UI.renderResumen(calc, $('chkIVARes').checked);
}
function setCanal(c) {
  estado.canal = c; calc = calcular(estado);
  escenas.forEach((s) => { s.onCanal?.(c); s.onCalculo?.(calc); });
  UI.renderCostes(calc, Math.min(7, estado.escena + 1), estado.incluirIVA);
  refrescarDetalle();
}
function mostrarResumen(on) {
  estado.resumen = on;
  $('resumen').hidden = !on;
  if (on) { UI.renderResumen(calc, $('chkIVARes').checked); $('resReiniciar').focus({ preventScroll: true }); }
}
function setLibre(v) {
  estado.libre = v; rig.setLibre(v);
  $('btnLibre').setAttribute('aria-pressed', v);
  if (!v && activa) { const m = plano(activa.camara.main); rig.volar(m.pos, m.target, { dur: 1.6 }); }
  UI.toast(v ? 'Vista libre: sin límites de órbita. Pulsa F para volver.' : 'Vista guiada');
}
function setPausa(v) { estado.pausa = v; $('btnPausa').setAttribute('aria-pressed', v); $('btnPausa').querySelector('.lbl').textContent = v ? 'Reanudar' : 'Pausa'; }
function aplicarCalidad(modo, aviso = true) {
  estado.calidadModo = modo; localStorage.setItem('vdc-calidad', modo);
  const nuevo = PERFILES[modo === 'auto' ? deteccion.id : modo];
  if (nuevo === q && aviso) { UI.toast(`Calidad ${q.nombre}`); return; }
  q = nuevo;
  post.construir(q); post.setScene(activa.scene, activa.post);
  escenas.forEach((s) => s.scene.traverse((o) => { if (o.isDirectionalLight || o.isSpotLight) { if (o.shadow?.map) { o.shadow.map.dispose(); o.shadow.map = null; } o.shadow.mapSize.set(q.shadowMap, q.shadowMap); } }));
  emitirEscala();
  if (aviso) UI.toast(`Calidad ${q.nombre}. La densidad de objetos se aplica al recargar.`);
}
function emitirEscala() {
  const h = renderer.domElement.height;
  escenas.forEach((s) => s.emisores?.forEach((e) => e.setEscala(h, camera.fov)));
}

/* ---------- Eventos de UI ---------- */
UI.initIncoterm($('incotermBar'), setIncoterm);
UI.renderIncoterm($('incotermBar'), estado.incoterm);
UI.initPasos((i) => irA(i));
UI.renderPasos(0);
UI.renderCostes(calc, 1, estado.incluirIVA);
$('selCalidad').value = estado.calidadModo;
$('selCalidad').addEventListener('change', (e) => aplicarCalidad(e.target.value));
$('btnAnt').addEventListener('click', () => irA(estado.escena - 1));
$('btnSig').addEventListener('click', () => irA(estado.escena + 1));
$('btnLibre').addEventListener('click', () => setLibre(!estado.libre));
$('btnPausa').addEventListener('click', () => setPausa(!estado.pausa));
$('btnAyuda').addEventListener('click', () => abrirAyuda(true));
$('ayCerrar').addEventListener('click', () => abrirAyuda(false));
$('btnEmpezar').addEventListener('click', empezar);
$('detCerrar').addEventListener('click', () => cerrarDetalle());
$('detVista').addEventListener('click', () => { cerrarDetalle(); });
$('detSiguiente').addEventListener('click', siguienteHotspot);
$('chkIVA').addEventListener('change', (e) => { estado.incluirIVA = e.target.checked; UI.renderCostes(calc, Math.min(7, estado.escena + 1), estado.incluirIVA); });
$('chkIVARes').addEventListener('change', () => UI.renderResumen(calc, $('chkIVARes').checked));
$('resVolver').addEventListener('click', () => irA(6));
$('resReiniciar').addEventListener('click', () => { hs.visto.clear(); irA(0); });
$('costesToggle').addEventListener('click', () => {
  const c = $('costes'); const col = c.classList.toggle('colapsado');
  $('costesToggle').setAttribute('aria-expanded', !col);
});
if (matchMedia('(max-width: 820px)').matches || innerHeight < 860) { $('costes').classList.add('colapsado'); $('costesToggle').setAttribute('aria-expanded', 'false'); }
$('detCuerpo').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.incoterm) setIncoterm(b.dataset.incoterm);
  if (b.dataset.canal) setCanal(b.dataset.canal);
  if (b.dataset.accion === 'resumen') irA(7);
});
function abrirAyuda(on) { $('ayuda').hidden = !on; if (on) $('ayCerrar').focus(); else $('btnAyuda').focus(); }

addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (!$('ayuda').hidden) { if (e.key === 'Escape') abrirAyuda(false); return; }
  if (!$('carga').hidden && !$('carga').classList.contains('fuera')) return;
  switch (e.key) {
    case 'ArrowRight': irA(estado.escena + 1); break;
    case 'ArrowLeft': irA(estado.escena - 1); break;
    case 'Escape': if (estado.abierto) cerrarDetalle(); else if (estado.resumen) irA(6); break;
    case 'f': case 'F': setLibre(!estado.libre); break;
    case 'p': case 'P': setPausa(!estado.pausa); break;
    case 'h': case 'H': case '?': abrirAyuda(true); break;
    case '0': irA(7); break;
    default: if (/^[1-7]$/.test(e.key)) irA(+e.key - 1);
  }
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); objetivoOffset();
  post.setSize(innerWidth, innerHeight);
  emitirEscala();
  UI.renderPasos(estado.escena);
  if (estado.resumen) UI.renderResumen(calc, $('chkIVARes').checked);
});
document.addEventListener('visibilitychange', () => { ultimoFrame = performance.now(); });

/* ---------- Desplazamiento del encuadre cuando hay panel abierto ---------- */
const offset = { x: 0, y: 0, tx: 0, ty: 0 };
function objetivoOffset() {
  offset.tx = 0; offset.ty = 0;
  if (!estado.abierto) return;
  const det = $('detalle').getBoundingClientRect();
  if (innerWidth <= 820) offset.ty = Math.min(det.height, innerHeight * 0.6) * 0.5; // hoja inferior → sube la imagen
  else offset.tx = (det.width + 16) * 0.5 - 140; // panel lateral → desplaza a la izquierda (compensa el panel de costes)
}
function aplicarOffset(dt) {
  const k = Math.min(1, dt * 5);
  offset.x += (offset.tx - offset.x) * k; offset.y += (offset.ty - offset.y) * k;
  if (Math.abs(offset.x) < 0.5 && Math.abs(offset.y) < 0.5 && !offset.tx && !offset.ty) { if (camera.view) camera.clearViewOffset(); return; }
  camera.setViewOffset(innerWidth, innerHeight, offset.x, offset.y, innerWidth, innerHeight);
}

/* ---------- Bucle ---------- */
let bajadas = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - ultimoFrame) / 1000); ultimoFrame = t;
  if (!activa) return;
  if (!estado.pausa) { tEscena += dt; activa.update(dt, tEscena); }
  rig.update(dt);
  aplicarOffset(dt);
  post.dibujar();
  hs.update(camera, innerWidth, innerHeight, estado.resumen);
  // bajada automática de calidad si va lento
  if (medidor.tick() && estado.calidadModo === 'auto' && medidor.lentos >= 4 && bajadas < 2 && !rig.volando) {
    const orden = ['alta', 'media', 'baja']; const i = orden.indexOf(q.id);
    if (i < 2) { bajadas++; medidor.lentos = 0; q = PERFILES[orden[i + 1]]; post.construir(q); post.setScene(activa.scene, activa.post); emitirEscala(); UI.toast(`Rendimiento bajo: calidad ${q.nombre}`); }
  }
}
requestAnimationFrame(frame);

// Exponer para depuración y pruebas automatizadas
window.__vdc = { post, estado, irA, abrirDetalle, cerrarDetalle, setIncoterm, setCanal, setPausa, get q() { return q; }, get calc() { return calc; }, renderer, camera, rig, escenas, empezar };

cargar().catch((e) => { console.error(e); fallo('Error al construir las escenas: ' + e.message); });
