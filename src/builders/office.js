/* =====================================================================
 *  OFICINA — sala, escritorio, documentos interactivos (contrato y
 *  factura proforma) con zonas resaltables y redibujado por Incoterm.
 * ===================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as M from '../core/materials.js';
import * as TX from '../core/textures.js';
import { DATA } from '../data.js';
import { makeContainer } from './container.js';

/* ---------------- Documentos ---------------- */
const A4 = { w: 1240, h: 1754 }; // px del canvas (proporción A4)
const SERIF = 'Inter, Arial';
const MONO = '"JetBrains Mono", monospace';

function linea(ctx, txt, x, y, size = 24, weight = 400, color = '#1e2329', font = SERIF) {
  ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
function parrafo(ctx, txt, x, y, maxW, size = 23, lh = 33, color = '#2b3138') {
  ctx.font = `400 ${size}px ${SERIF}`; ctx.fillStyle = color;
  const words = txt.split(' '); let l = ''; let yy = y;
  for (const w of words) { const t = l ? l + ' ' + w : w; if (ctx.measureText(t).width > maxW) { ctx.fillText(l, x, yy); l = w; yy += lh; } else l = t; }
  if (l) ctx.fillText(l, x, yy);
  return yy + lh;
}
let granoPapel = null;
function papel(ctx, w, h) {
  // el grano se genera una sola vez (evita lecturas repetidas de píxeles)
  if (!granoPapel || granoPapel.width !== w || granoPapel.height !== h) {
    granoPapel = TX.canvas(w, h);
    const g = granoPapel.getContext('2d');
    g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 7; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
  }
  ctx.drawImage(granoPapel, 0, 0);
}
/** Dibuja el contrato. Devuelve las zonas (px) de cada cláusula. */
function dibujarContrato(ctx, w, h, { incoterm, resaltado }) {
  const op = DATA.operacion;
  papel(ctx, w, h);
  const zonas = {};
  const X = 110, MW = w - 220;
  linea(ctx, 'CONTRATO DE COMPRAVENTA INTERNACIONAL', X, 150, 40, 700, '#12233d');
  linea(ctx, `Nº ${op.contrato}  ·  Villaserena, 18 de octubre de 2026`, X, 200, 22, 500, '#5a6470', MONO);
  ctx.fillStyle = '#d9622b'; ctx.fillRect(X, 225, 140, 6);
  let y = 300;
  y = parrafo(ctx, `VENDEDOR: ${op.vendedor.nombre}, ${op.vendedor.ciudad} (${op.vendedor.pais}).`, X, y, MW);
  y = parrafo(ctx, `COMPRADOR: ${op.comprador.nombre}, ${op.comprador.ciudad} (${op.comprador.pais}). EORI ${op.comprador.eori}.`, X, y + 4, MW);
  y += 20;
  const clausula = (id, titulo, cuerpo) => {
    const y0 = y - 34;
    linea(ctx, titulo, X, y, 26, 700, '#12233d');
    const tx = X + ctx.measureText(titulo).width + 34;
    y = parrafo(ctx, cuerpo, X, y + 40, MW);
    zonas[id] = { x: X - 26, y: y0, w: MW + 52, h: y - y0 - 8, ax: tx, ay: y0 + 24 };
    y += 26;
  };
  clausula('objeto', '1. Objeto', `${op.mercancia.unidades.toLocaleString('es-ES')} unidades de ${op.mercancia.descripcion}, en ${op.mercancia.bultos} palés.`);
  clausula('incoterm', '2. Condiciones de entrega', `${incoterm} ${incotermLugar(incoterm)} (Incoterms® 2020). ${DATA.incoterms[incoterm].resumen}`);
  clausula('pago', '3. Forma de pago', `${op.pago}, emitido por el banco del comprador contra presentación de factura comercial, B/L limpio a bordo, certificado de origen y lista de bultos.`);
  clausula('seguro', '4. Seguro', seguroTexto(incoterm));
  clausula('transporte', '5. Transporte', `Contenedor completo (FCL) ${op.contenedor.tipo}. Ruta: almacén del vendedor → ${op.origen} → ${op.destino} → ${op.entrega}. Naviera: ${op.naviera}.`);
  clausula('ley', '6. Ley aplicable', 'Convención de Viena de 1980 sobre compraventa internacional de mercaderías. Arbitraje en Villaserena.');
  // firmas
  const fy = h - 230;
  ctx.strokeStyle = '#6b7480'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(X, fy); ctx.lineTo(X + 400, fy); ctx.moveTo(w - X - 400, fy); ctx.lineTo(w - X, fy); ctx.stroke();
  linea(ctx, 'Por el vendedor', X, fy + 40, 21, 500, '#5a6470');
  linea(ctx, 'Por el comprador', w - X - 400, fy + 40, 21, 500, '#5a6470');
  // rúbricas a mano
  ctx.strokeStyle = '#1d3f7a'; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i < 60; i++) { const t = i / 59; const xx = X + 30 + t * 300; const yy = fy - 30 + Math.sin(t * 13) * 18 * (1 - t) - t * 10; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 60; i++) { const t = i / 59; const xx = w - X - 360 + t * 300; const yy = fy - 26 + Math.cos(t * 10) * 16 * (1 - t * 0.6); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
  ctx.stroke();
  linea(ctx, DATA.meta.aviso, X, h - 90, 17, 400, '#8a929b');
  pintarResaltado(ctx, zonas, resaltado);
  return zonas;
}
function incotermLugar(i) {
  const op = DATA.operacion;
  return ({ EXW: `almacén del vendedor, ${op.vendedor.ciudad}`, FOB: op.origen, CIF: op.destino, DAP: op.entrega, DDP: op.entrega })[i];
}
function seguroTexto(i) {
  if (i === 'CIF') return 'A cargo del vendedor: cobertura mínima ICC (C) por el 110 % del valor CIF, póliza endosable a favor del comprador.';
  if (i === 'DAP' || i === 'DDP') return 'El vendedor soporta el riesgo hasta destino y asegura en su propio interés (ICC A recomendada).';
  return 'A cargo del comprador, que decide si asegura y con qué cobertura (recomendada ICC A, 110 % del valor CIF).';
}

function dibujarProforma(ctx, w, h, { resaltado }) {
  const op = DATA.operacion;
  papel(ctx, w, h);
  const zonas = {};
  const X = 90;
  ctx.fillStyle = '#12233d'; ctx.fillRect(0, 0, w, 130);
  linea(ctx, 'FACTURA PROFORMA', X, 85, 46, 700, '#ffffff');
  linea(ctx, op.proforma, w - X - 300, 82, 26, 500, '#f0b38f', MONO);
  linea(ctx, op.vendedor.nombre, X, 210, 28, 700);
  linea(ctx, `${op.vendedor.ciudad} · ${op.vendedor.pais}`, X, 248, 22, 400, '#5a6470');
  linea(ctx, 'Facturar a:', X, 320, 20, 600, '#5a6470');
  linea(ctx, op.comprador.nombre, X, 354, 24, 600);
  // tabla
  let y = 450;
  ctx.fillStyle = '#e9e4d8'; ctx.fillRect(X, y - 34, w - 2 * X, 50);
  linea(ctx, 'Descripción', X + 16, y, 21, 700); linea(ctx, 'Cant.', X + 560, y, 21, 700); linea(ctx, 'Precio', X + 700, y, 21, 700); linea(ctx, 'Importe', X + 880, y, 21, 700);
  y += 70;
  linea(ctx, 'Lámpara LED NOVA-12', X + 16, y, 22, 500);
  linea(ctx, '2.400', X + 560, y, 22, 400, '#1e2329', MONO); linea(ctx, '18,75', X + 700, y, 22, 400, '#1e2329', MONO); linea(ctx, '45.000,00', X + 880, y, 22, 400, '#1e2329', MONO);
  y += 40; linea(ctx, `Partida ${op.partida.codigo} (ej. didáctico)`, X + 16, y, 18, 400, '#6b7480');
  y += 40; linea(ctx, 'Embalaje: 20 palés NIMF 15, film y cantoneras', X + 16, y, 18, 400, '#6b7480');
  y += 40; linea(ctx, `Peso bruto ${op.mercancia.pesoBruto.toLocaleString('es-ES')} kg · 68 m³`, X + 16, y, 18, 400, '#6b7480');
  ctx.strokeStyle = '#c9c2b2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, y + 30); ctx.lineTo(w - X, y + 30); ctx.stroke();
  y += 100;
  zonas.precio = { x: X + 520, y: y - 50, w: w - 2 * X - 520 + 20, h: 80, ax: X + 480, ay: y - 10 };
  linea(ctx, 'TOTAL EXW', X + 560, y, 26, 700, '#12233d'); linea(ctx, '45.000,00 €', X + 820, y, 30, 700, '#12233d', MONO);
  y += 90;
  parrafo(ctx, 'Precio en fábrica, sin incluir transporte, seguro, despacho ni tributos. Validez: 30 días.', X, y, w - 2 * X, 20, 30, '#5a6470');
  // sello
  ctx.save(); ctx.translate(w - 320, h - 360); ctx.rotate(-0.18);
  ctx.strokeStyle = 'rgba(178,40,40,0.75)'; ctx.lineWidth = 6; ctx.strokeRect(-140, -60, 280, 120);
  ctx.font = `700 36px ${SERIF}`; ctx.fillStyle = 'rgba(178,40,40,0.75)'; ctx.textAlign = 'center'; ctx.fillText('BRIGHTWAVE', 0, -6); ctx.font = `600 22px ${SERIF}`; ctx.fillText('EXPORT DEPT.', 0, 32);
  ctx.restore(); ctx.textAlign = 'left';
  linea(ctx, DATA.meta.aviso, X, h - 70, 16, 400, '#8a929b');
  pintarResaltado(ctx, zonas, resaltado);
  return zonas;
}
function pintarResaltado(ctx, zonas, id) {
  if (!id || !zonas[id]) return;
  const z = zonas[id];
  ctx.save();
  ctx.fillStyle = 'rgba(255,170,60,0.28)'; ctx.fillRect(z.x, z.y, z.w, z.h);
  ctx.strokeStyle = 'rgba(217,98,43,0.95)'; ctx.lineWidth = 6; ctx.strokeRect(z.x, z.y, z.w, z.h);
  ctx.restore();
}

/**
 * Documento en 3D (plano A4 de 0.21 x 0.297 m escalado).
 * tipo: 'contrato' | 'proforma'
 */
export function makeDocumento(tipo, escala = 1.6) {
  const cv = TX.canvas(A4.w, A4.h), ctx = cv.getContext('2d');
  const tex = TX.toTex(cv, { wrap: false });
  const W = 0.21 * escala, H = 0.297 * escala;
  // ligera ondulación del papel
  const geo = new THREE.PlaneGeometry(W, H, 16, 16);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin((x / W) * 3.1) * 0.002 + Math.cos((y / H) * 4.0) * 0.0015 + 0.002); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true; mesh.castShadow = true;
  const estado = { incoterm: DATA.incotermInicial, resaltado: null };
  let zonas = {};
  const redibujar = () => {
    zonas = tipo === 'contrato' ? dibujarContrato(ctx, A4.w, A4.h, estado) : dibujarProforma(ctx, A4.w, A4.h, estado);
    tex.needsUpdate = true;
  };
  redibujar();
  /** Centro de una zona en coordenadas locales del mesh (antes de rotar). */
  const centroZona = (id) => {
    const z = zonas[id]; if (!z) return null;
    const u = (z.ax ?? z.x + z.w * 0.94) / A4.w, v = (z.ay ?? z.y + z.h / 2) / A4.h;
    return new THREE.Vector3((u - 0.5) * W, (0.5 - v) * H, 0.01);
  };
  mesh.userData = {
    zonas: () => zonas,
    resaltar(id) { estado.resaltado = id; redibujar(); },
    setIncoterm(i) { estado.incoterm = i; redibujar(); },
    posZona: (id) => centroZona(id),
    anclaZona(id) { const c = centroZona(id); if (!c) return null; const o = new THREE.Object3D(); o.position.copy(c); mesh.add(o); return o; },
  };
  return mesh;
}

/* ---------------- Mobiliario ---------------- */
export function makeOficina({ q }) {
  const g = new THREE.Group(); g.name = 'oficina';
  // Sala 7 x 3 x 6
  const pared = new THREE.MeshStandardMaterial({ map: (() => { const t = TX.plaster().clone(); t.repeat.set(3, 2); t.needsUpdate = true; return t; })(), roughness: 0.92, color: 0xe9e3d8 });
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), M.madera('roble', 2.5, 2.2)); suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; g.add(suelo);
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), M.pintura(0xf2f0ec, 0.95, 0)); techo.rotation.x = Math.PI / 2; techo.position.y = 3.1; g.add(techo);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.1), pared); back.position.set(0, 1.55, -3); back.receiveShadow = true; g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.1), pared); left.position.set(-4.5, 1.55, 1); left.rotation.y = Math.PI / 2; left.receiveShadow = true; g.add(left);
  // Pared derecha con ventanal (marco + cristal + vista exterior)
  const winW = 4.2, winH = 2.0, winY = 1.6, wx = 4.5;
  const segs = [[8, 0.6, 0.3, 1], [8, 0.5, 2.85, 1]]; // bajo y sobre ventana: [ancho, alto, y, z]
  for (const [w, h, y] of segs) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pared); s.position.set(wx, y, 1); s.rotation.y = -Math.PI / 2; s.receiveShadow = true; g.add(s); }
  for (const z of [-2.0, 4.0]) { const w = z < 0 ? 1.8 : 1.8; const s = new THREE.Mesh(new THREE.PlaneGeometry(w, winH), pared); s.position.set(wx, winY, z < 0 ? -2.1 : 4.1); s.rotation.y = -Math.PI / 2; g.add(s); }
  // marco y montantes (proyectan sombra)
  const marco = M.pintura(0x2a2f36, 0.5, 0.6);
  const frameParts = [[0.08, winH + 0.1, 0.08, 0, winY, -winW / 2 + 1], [0.08, winH + 0.1, 0.08, 0, winY, winW / 2 + 1], [0.08, 0.08, winW, 0, winY + winH / 2, 1], [0.08, 0.08, winW, 0, winY - winH / 2, 1], [0.06, winH, 0.06, 0, winY, 1 - winW / 6], [0.06, winH, 0.06, 0, winY, 1 + winW / 6], [0.06, 0.06, winW, 0, winY + 0.25, 1]];
  for (const [a, b, c, x, y, z] of frameParts) { const m = new THREE.Mesh(new THREE.BoxGeometry(a, b, c), marco); m.position.set(wx + x, y, z); m.castShadow = true; g.add(m); }
  // vista exterior pintada (puerto al atardecer, ficticio)
  const vista = TX.textPanel('vistaOficina', 1024, 512, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9ec3e6'); gr.addColorStop(0.55, '#f2d3a6'); gr.addColorStop(0.62, '#f6c48c'); gr.addColorStop(1, '#b98b63');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(70,82,98,0.55)';
    for (let i = 0; i < 14; i++) { const x = i * 80 + 20, hh = 60 + (i * 37 % 90); ctx.fillRect(x, h * 0.62 - hh, 50, hh); }
    ctx.fillStyle = 'rgba(52,62,76,0.6)';
    for (const x of [180, 420, 700]) { ctx.fillRect(x, h * 0.2, 10, h * 0.42); ctx.fillRect(x + 60, h * 0.2, 10, h * 0.42); ctx.fillRect(x - 60, h * 0.24, 230, 10); ctx.fillRect(x + 30, h * 0.1, 8, h * 0.14); }
  }, { srgb: true });
  const vm = new THREE.Mesh(new THREE.PlaneGeometry(winW * 2.2, winH * 2.2), new THREE.MeshBasicMaterial({ map: vista, color: 0xd8d8d8 }));
  vm.position.set(wx + 3, winY, 1); vm.rotation.y = -Math.PI / 2; g.add(vm);

  // Escritorio
  const desk = new THREE.Group(); g.add(desk);
  const top = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.05, 1.0, 2, 0.012), M.madera('nogal', 1, 1)); top.position.y = 0.75; top.castShadow = true; top.receiveShadow = true; desk.add(top);
  const legM = M.acero(0x1e2126, 0.4, 0.8);
  for (const [x, z] of [[-0.92, -0.42], [0.92, -0.42], [-0.92, 0.42], [0.92, 0.42]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.73, 0.05), legM); l.position.set(x, 0.365, z); l.castShadow = true; desk.add(l); }
  const modesty = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.02), legM); modesty.position.set(0, 0.5, -0.42); desk.add(modesty);
  // portátil
  const lap = new THREE.Group(); lap.position.set(-0.76, 0.776, -0.22); lap.rotation.y = 0.45; desk.add(lap);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.016, 0.24, 2, 0.006), M.acero(0x9a9ea4, 0.35, 0.9)); base.castShadow = true; lap.add(base);
  const pantallaTex = TX.textPanel('pantallaPortatil', 512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#0f1722'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d9622b'; ctx.fillRect(0, 0, w, 26);
    ctx.font = '600 15px Inter, Arial'; ctx.fillStyle = '#fff'; ctx.fillText('Cotización transporte · Ref. CV-2026-0187', 10, 18);
    ctx.font = '13px "JetBrains Mono", monospace';
    const rows = [['Flete 40HC', '2.150,00'], ['BAF', '310,00'], ['CAF', '95,00'], ['THC destino', '245,00'], ['Seguro', '96,00']];
    rows.forEach((r, i) => { ctx.fillStyle = i % 2 ? '#162131' : '#121b28'; ctx.fillRect(10, 40 + i * 30, w - 20, 28); ctx.fillStyle = '#c9d4e2'; ctx.fillText(r[0], 18, 59 + i * 30); ctx.fillText(r[1], w - 110, 59 + i * 30); });
    ctx.fillStyle = '#3d8bd9'; for (let i = 0; i < 8; i++) ctx.fillRect(20 + i * 58, h - 30 - (20 + (i * 47) % 70), 34, 20 + (i * 47) % 70);
  });
  const lid = new THREE.Group(); lid.position.set(0, 0.008, -0.118); lid.rotation.x = -1.85 + Math.PI / 2; lap.add(lid);
  const lidM = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.012, 0.23, 2, 0.005), M.acero(0x9a9ea4, 0.35, 0.9)); lidM.position.z = -0.115; lidM.castShadow = true; lid.add(lidM);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshStandardMaterial({ map: pantallaTex, emissive: 0xffffff, emissiveMap: pantallaTex, emissiveIntensity: 0.9, roughness: 0.2 }));
  scr.rotation.x = Math.PI / 2; scr.position.set(0, 0.0065, -0.115); scr.rotation.z = Math.PI; lid.add(scr);
  // taza de café
  const pts = []; for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(0.038 + Math.sin(i / 10 * 1.2) * 0.004, i * 0.0095));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), M.pintura(0xf4f1ea, 0.25, 0)); cup.position.set(0.72, 0.775, 0.1); cup.castShadow = true; desk.add(cup);
  const cafe = new THREE.Mesh(new THREE.CircleGeometry(0.036, 20), M.pintura(0x2a160c, 0.15, 0)); cafe.rotation.x = -Math.PI / 2; cafe.position.set(0.72, 0.855, 0.1); desk.add(cafe);
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16, Math.PI * 1.2), M.pintura(0xf4f1ea, 0.25, 0)); asa.position.set(0.765, 0.82, 0.1); asa.rotation.z = -Math.PI * 0.6; desk.add(asa);
  // bolígrafo
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), M.pintura(0x12233d, 0.3, 0.6)); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; pen.position.set(0.25, 0.78, 0.33); pen.castShadow = true; desk.add(pen);
  // sello y tampón
  const stamp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.07, 14), M.madera('nogal', 0.2, 0.2)); stamp.position.set(0.6, 0.81, -0.25); stamp.castShadow = true; desk.add(stamp);
  // maqueta de contenedor
  const maqueta = makeContainer({ color: 0xc9592a, marca: 'MAREVAL', codigo: 'MRVU 100200 3', precinto: false });
  maqueta.scale.setScalar(0.016); maqueta.position.set(0.62, 0.776, -0.36); maqueta.rotation.y = -0.4; desk.add(maqueta);
  // flexo
  const lampM = M.pintura(0x1f2329, 0.4, 0.7);
  const lamp = new THREE.Group(); lamp.position.set(-0.85, 0.776, -0.38); desk.add(lamp);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 20), lampM); lamp.add(lb);
  const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), lampM); a1.position.set(0, 0.2, 0.05); a1.rotation.x = 0.3; lamp.add(a1);
  const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), lampM); a2.position.set(0.0, 0.43, 0.2); a2.rotation.x = 1.1; lamp.add(a2);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 20, 1, true), lampM); head.position.set(0, 0.47, 0.37); head.rotation.x = 2.4; lamp.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), M.emisivo(0xffe2b0, 4)); bulb.position.set(0, 0.45, 0.39); lamp.add(bulb);
  // planta
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.4, 20), M.pintura(0x2d3238, 0.7, 0.1)); pot.position.set(-3.6, 0.2, -2.3); pot.castShadow = true; g.add(pot);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 18; i++) {
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.6), leafM);
    const a = (i / 18) * Math.PI * 2; lf.position.set(-3.6 + Math.cos(a) * 0.08, 0.7 + (i % 3) * 0.12, -2.3 + Math.sin(a) * 0.08);
    lf.rotation.set(-0.4 - (i % 4) * 0.12, a, 0); lf.castShadow = true; g.add(lf);
  }
  // estantería con archivadores
  const shelf = new THREE.Group(); shelf.position.set(-2.4, 0, -2.75); g.add(shelf);
  for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.38), M.madera('roble', 1, 0.3)); s.position.y = 0.3 + k * 0.5; s.castShadow = true; shelf.add(s); }
  const colsB = [0x12233d, 0xd9622b, 0x7b8591, 0x2a5d8f, 0xe9e9e4];
  for (let k = 0; k < 3; k++) for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.32, 0.3), M.pintura(colsB[(i * 7 + k) % colsB.length], 0.6, 0)); b.position.set(-0.8 + i * 0.12, 0.48 + k * 0.5, 0); b.rotation.z = (i % 5 === 4 ? 0.12 : 0); b.castShadow = true; shelf.add(b);
  }
  // cuadro (mapa de rutas ficticio)
  const mapa = TX.textPanel('mapaRutas', 768, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0f1b2d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#20324a'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(120 + i * 95, 200 + Math.sin(i) * 80, 70, 40 + i * 6, i, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#d9622b'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(660, 160); ctx.bezierCurveTo(500, 420, 260, 380, 110, 220); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = '600 20px Inter, Arial'; ctx.fillText('Haizhou', 600, 140); ctx.fillText('Valmar', 70, 200);
    ctx.font = '500 16px Inter, Arial'; ctx.fillStyle = '#8fa3bd'; ctx.fillText('Ruta Oceanis Line · 21 días · mapa ficticio', 30, h - 26);
  });
  const cuadro = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.4 })); cuadro.position.set(0.6, 1.9, -2.98); g.add(cuadro);
  const marcoC = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.08, 0.03), M.pintura(0x1a1d22, 0.4, 0.5)); marcoC.position.set(0.6, 1.9, -3.0); g.add(marcoC);
  // silla
  const chair = new THREE.Group(); chair.position.set(0.1, 0, 0.95); chair.rotation.y = 0.2; g.add(chair);
  const seatM = M.pintura(0x1b1e22, 0.85, 0.05);
  const st = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.08, 0.5, 2, 0.03), seatM); st.position.y = 0.48; st.castShadow = true; chair.add(st);
  const bk = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.62, 0.07, 2, 0.03), seatM); bk.position.set(0, 0.86, 0.24); bk.rotation.x = -0.12; bk.castShadow = true; chair.add(bk);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 10), M.cromo()); pole.position.y = 0.25; chair.add(pole);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.04), M.cromo()); arm.position.set(Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16); arm.rotation.y = -a; chair.add(arm); }

  g.userData.escritorio = desk;
  return g;
}
