/* =====================================================================
 *  PANELES DE UI — selector de Incoterm, progreso, panel de costes,
 *  panel de detalle de cada hotspot y resumen final con cascada.
 * ===================================================================== */
import { DATA, INCOTERMS_ORDEN } from '../data.js';
import { fmtEUR, fmtNum, acumulado } from '../logic/costs.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chip = (p) => `<span class="chip ${p}">${p === 'vendedor' ? 'Paga el vendedor' : 'Paga el comprador'}</span>`;

/* ---------- Selector de Incoterm ---------- */
export function initIncoterm(cont, onChange) {
  INCOTERMS_ORDEN.forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = k; b.setAttribute('role', 'radio');
    b.title = `${k} · ${DATA.incoterms[k].nombre}`; b.dataset.k = k;
    b.addEventListener('click', () => onChange(k));
    cont.appendChild(b);
  });
  // flechas dentro del grupo
  cont.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.stopPropagation(); e.preventDefault();
    const cur = cont.querySelector('[aria-checked="true"]')?.dataset.k;
    const i = INCOTERMS_ORDEN.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1);
    const k = INCOTERMS_ORDEN[(i + 5) % 5]; onChange(k);
    cont.querySelector(`[data-k="${k}"]`).focus();
  });
}
export function renderIncoterm(cont, sel) {
  cont.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === sel; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
}

/* ---------- Pasos ---------- */
export function initPasos(onGo) {
  const ol = $('pasos');
  const relleno = document.createElement('div'); relleno.className = 'relleno'; ol.appendChild(relleno);
  const fases = [...DATA.fases.map((f) => ({ n: f.n, nombre: f.nombre })), { n: 8, nombre: 'Resumen' }];
  fases.forEach((f, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button class="paso" type="button" data-i="${i}" aria-label="${i < 7 ? `Escena ${f.n}: ${esc(f.nombre)}` : 'Resumen de costes'}"><span class="b">${i < 7 ? f.n : 'Σ'}</span><span class="t">${esc(f.nombre)}</span></button>`;
    li.querySelector('button').addEventListener('click', () => onGo(i));
    ol.appendChild(li);
  });
}
export function renderPasos(i) {
  document.querySelectorAll('.paso').forEach((b) => {
    const k = +b.dataset.i;
    b.classList.toggle('hecho', k < i);
    if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  const ol = $('pasos'); const items = ol.querySelectorAll('li');
  const rel = ol.querySelector('.relleno');
  if (items.length) {
    const first = items[0].getBoundingClientRect(), cur = items[Math.min(i, items.length - 1)].getBoundingClientRect(), o = ol.getBoundingClientRect();
    rel.style.left = `${first.left + first.width / 2 - o.left}px`;
    rel.style.width = `${Math.max(0, cur.left + cur.width / 2 - (first.left + first.width / 2))}px`;
  }
  $('btnAnt').disabled = i === 0;
  $('btnSig').disabled = i >= 7;
  const f = DATA.fases[i];
  $('rotN').textContent = i < 7 ? `${i + 1}/7` : 'Σ';
  $('rotNombre').textContent = f ? f.nombre : 'Resumen de costes';
  $('rotLugar').textContent = f ? f.lugar : 'Coste total puesto en destino';
  $('rotHora').textContent = f ? f.hora : '';
}

/* ---------- Panel de costes ---------- */
let ultimoTotal = 0, anim = null;
export function renderCostes(calc, n, incluirIVA) {
  const ac = acumulado(calc, n, { incluirIVA });
  const el = $('totalAcum');
  const desde = ultimoTotal, hasta = ac.total; ultimoTotal = hasta;
  cancelAnimationFrame(anim);
  const t0 = performance.now(), dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 700;
  const paso = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmtEUR(desde + (hasta - desde) * e); if (k < 1) anim = requestAnimationFrame(paso); };
  anim = requestAnimationFrame(paso);
  const tot = Math.max(1, ac.vendedor + ac.comprador);
  $('splitV').style.width = `${(ac.vendedor / tot) * 100}%`;
  $('splitC').style.width = `${(ac.comprador / tot) * 100}%`;
  $('totV').textContent = fmtEUR(ac.vendedor, 0);
  $('totC').textContent = fmtEUR(ac.comprador, 0);
  const ol = $('listaFases'); ol.innerHTML = '';
  calc.fases.forEach((f, i) => {
    const imp = incluirIVA ? f.total : f.sinIVA;
    const cls = i < n - 1 ? 'hecha' : i === n - 1 ? 'actual' : 'pendiente';
    const li = document.createElement('li'); li.className = cls;
    li.innerHTML = `<span class="num">${i + 1}</span><span>${esc(f.nombre)}</span><span class="imp">${i < n ? fmtEUR(imp, 0) : '—'}</span>`;
    ol.appendChild(li);
  });
  if (n >= 7) {
    const li = document.createElement('li'); li.className = 'total';
    li.innerHTML = `<span></span><span>Puesto en destino</span><span class="imp">${fmtEUR(incluirIVA ? calc.totalConIVA : calc.totalSinIVA, 0)}</span>`;
    ol.appendChild(li);
  }
  $('notaCostes').textContent = `Incluye la mercancía (${fmtEUR(calc.mercancia, 0)}). Incoterm ${calc.estado.incoterm}.`;
}

/* ---------- Panel de detalle ---------- */
function filasPartidas(calc, claves, previa) {
  if (!claves.length) return '';
  let total = 0;
  const filas = claves.map((k) => {
    const it = calc.items[k]; total += it.importe;
    const fase = DATA.fases[it.fase - 1];
    return `<tr><td>${esc(it.label)}<br>${chip(it.pagadorActual)}${previa && fase ? ` <span class="chip" style="color:var(--texto-3);border:1px solid var(--linea)">Fase ${fase.n}</span>` : ''}</td><td class="imp">${fmtEUR(it.importe)}</td></tr>`;
  }).join('');
  const tot = claves.length > 1 ? `<tr class="total"><td>Total</td><td class="imp">${fmtEUR(total)}</td></tr>` : '';
  return `<table class="partidas"><tbody>${filas}${tot}</tbody></table>`;
}

function matrizIncoterm(sel) {
  const filas = [
    ['Carga en origen', 'carga'], ['Transporte a puerto', 'precarriage'], ['Despacho de exportación', 'dua_export'], ['THC de origen', 'thc_origen'],
    ['Flete y recargos', 'flete'], ['Seguro', 'seguro'], ['THC de destino', 'thc_destino'], ['Despacho, arancel e IVA', 'arancel'], ['Transporte final', 'transporte_final'], ['Descarga en destino', 'descarga'],
  ];
  const head = `<tr><th>Partida</th>${INCOTERMS_ORDEN.map((k) => `<th class="${k === sel ? 'sel' : ''}">${k}</th>`).join('')}</tr>`;
  const body = filas.map(([n, k]) => `<tr><td>${n}</td>${INCOTERMS_ORDEN.map((ic, i) => { const l = DATA.costes[k].pagador[i]; return `<td class="${ic === sel ? 'sel' : ''}"><span class="vc ${l}" aria-label="${l === 'V' ? 'vendedor' : 'comprador'}">${l}</span></td>`; }).join('')}</tr>`).join('');
  return `<table class="matriz" aria-label="Quién paga cada partida según el Incoterm (V vendedor, C comprador)"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

export function contenidoDetalle(h, calc, estado) {
  const op = DATA.operacion;
  let html = `<p>${esc(h.texto)}</p>`;
  if (h.tipo === 'incoterm') {
    const ic = DATA.incoterms[estado.incoterm];
    html += `<div class="inco-sel" role="radiogroup" aria-label="Elegir Incoterm">${INCOTERMS_ORDEN.map((k) => `<button type="button" role="radio" aria-checked="${k === estado.incoterm}" data-incoterm="${k}">${k}</button>`).join('')}</div>`;
    html += `<dl class="inco-info"><dt>${estado.incoterm} · ${esc(ic.nombre)}</dt><dd>${esc(ic.resumen)}</dd><dt>Riesgo</dt><dd>${esc(ic.riesgo)}</dd><dt>Ojo</dt><dd>${esc(ic.nota)}</dd></dl>`;
    html += matrizIncoterm(estado.incoterm);
    const ac = acumulado(calc, 7, { incluirIVA: false });
    html += `<div class="calc"><div class="row"><span>Paga el vendedor (sin IVA)</span><b>${fmtEUR(ac.vendedor)}</b></div><div class="row"><span>Paga el comprador (sin IVA)</span><b>${fmtEUR(ac.comprador)}</b></div></div>`;
  }
  if (h.tipo === 'canal') {
    html += `<div class="canales" role="radiogroup" aria-label="Canal de riesgo">${['verde', 'naranja', 'rojo'].map((c) => `<button type="button" role="radio" class="${c}" data-canal="${c}" aria-checked="${c === estado.canal}"><i aria-hidden="true"></i>${DATA.canales[c].nombre}</button>`).join('')}</div>`;
    html += `<p class="aviso">${esc(DATA.canales[estado.canal].texto)}</p>`;
  }
  if (h.tipo === 'partida') {
    html += `<div class="calc"><div class="codigo">${esc(op.partida.codigo)}</div><div class="row"><span>${esc(op.partida.descripcion)}</span></div><div class="row"><span>Tipo del arancel (ficticio)</span><b>${fmtNum(op.partida.arancel * 100, 1)} %</b></div><div class="row"><span>IVA</span><b>${fmtNum(op.iva * 100)} %</b></div></div><p class="aviso">${esc(op.partida.nota)}</p>`;
  }
  if (h.tipo === 'arancel') {
    const inc = Object.values(calc.items).filter((i) => i.valorAduana);
    html += `<div class="calc"><div class="row res"><span>Valor en aduana</span><b>${fmtEUR(calc.valorAduana)}</b></div><div class="row res"><span>Arancel ${fmtNum(op.partida.arancel * 100, 1)} % (ficticio)</span><b>${fmtEUR(calc.arancel)}</b></div></div>`;
    html += `<details class="calc"><summary>Composición del valor en aduana</summary>${inc.map((i) => `<div class="row"><span>${esc(i.label)}</span><b>${fmtEUR(i.importe)}</b></div>`).join('')}</details>`;
    html += `<p class="aviso">Todos los gastos hasta la frontera de la UE forman parte del valor en aduana, los pague quien los pague.</p>`;
  }
  if (h.tipo === 'iva') {
    html += `<div class="calc"><div class="row"><span>Valor en aduana</span><b>${fmtEUR(calc.valorAduana)}</b></div><div class="row"><span>+ Arancel</span><b>${fmtEUR(calc.arancel)}</b></div><div class="row"><span>+ Gastos accesorios hasta destino</span><b>${fmtEUR(calc.accesorios)}</b></div><div class="row res"><span>Base imponible</span><b>${fmtEUR(calc.baseIVA)}</b></div><div class="row res"><span>IVA ${fmtNum(op.iva * 100)} %</span><b>${fmtEUR(calc.iva)}</b></div></div>`;
  }
  if (h.tipo === 'levante') html += `<p class="aviso">Estado del DUA: admitido, deuda garantizada. MRN ${esc(op.mrnImport)}.</p>`;
  if (h.costes?.length) html += filasPartidas(calc, h.costes, h.previa);
  if (h.previa) html += `<p class="aviso">Este importe se suma al acumulado en la fase en que se devenga, no aquí.</p>`;
  if (h.tipo === 'libre') html += `<button class="btn primary" type="button" data-accion="resumen">Ver el resumen de costes</button>`;
  return html;
}

/* ---------- Resumen y gráfico en cascada ---------- */
export function renderResumen(calc, incluirIVA) {
  // reparto de los costes logísticos y aduaneros (sin la mercancía)
  const ac = { vendedor: 0, comprador: 0, total: 0 };
  for (const it of Object.values(calc.items)) { if (it.tipo === 'mercancia' || (!incluirIVA && it.deducible)) continue; ac[it.pagadorActual] += it.importe; ac.total += it.importe; }
  const costes = incluirIVA ? calc.totalConIVA - calc.mercancia : calc.costesSinIVA;
  const total = incluirIVA ? calc.totalConIVA : calc.totalSinIVA;
  $('kpis').innerHTML = [
    ['Mercancía', fmtEUR(calc.mercancia, 0), `${fmtNum(DATA.operacion.mercancia.unidades)} uds × ${fmtEUR(DATA.operacion.mercancia.precioUnitario)}`],
    ['Logística y aduanas', fmtEUR(costes, 0), `${fmtNum((costes / calc.mercancia) * 100, 1)} % sobre la mercancía`],
    ['Puesto en destino', fmtEUR(total, 0), `${fmtEUR(total / DATA.operacion.mercancia.unidades)} por unidad${incluirIVA ? ' (con IVA)' : ' (sin IVA)'}`, true],
    ['Vendedor / comprador · ' + calc.estado.incoterm, `${fmtNum((ac.vendedor / Math.max(1, ac.total)) * 100, 0)} / ${fmtNum((ac.comprador / Math.max(1, ac.total)) * 100, 0)} %`, `Vendedor ${fmtEUR(ac.vendedor, 0)} · Comprador ${fmtEUR(ac.comprador, 0)}`],
  ].map(([k, v, s, d]) => `<div class="kpi${d ? ' destacado' : ''}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');
  $('cascada').innerHTML = innerWidth < 640 ? cascadaVertical(calc, incluirIVA) : cascadaSVG(calc, incluirIVA);
  // tabla
  let rows = '';
  calc.fases.forEach((f) => {
    rows += `<tr class="fase"><td colspan="3">${f.n}. ${esc(f.nombre)}</td></tr>`;
    f.items.forEach((it) => { rows += `<tr><td>${esc(it.label)}${it.deducible ? ' <small>(deducible)</small>' : ''}</td><td>${it.pagadorActual === 'vendedor' ? 'Vendedor' : 'Comprador'}</td><td class="imp">${fmtEUR(it.importe)}</td></tr>`; });
  });
  rows += `<tr class="fase"><td colspan="2">Valor en aduana · base IVA</td><td class="imp">${fmtEUR(calc.valorAduana)} · ${fmtEUR(calc.baseIVA)}</td></tr>`;
  $('tablaPartidas').innerHTML = `<table><thead><tr><th>Partida</th><th>Paga</th><th style="text-align:right">Importe</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function cascadaSVG(calc, incluirIVA) {
  const W = 1000, H = 330, ml = 64, mr = 16, mt = 26, mb = 60;
  const fases = calc.fases.map((f) => {
    let v = 0, c = 0;
    for (const it of f.items) { if (it.tipo === 'mercancia' || (!incluirIVA && it.deducible)) continue; if (it.pagadorActual === 'vendedor') v += it.importe; else c += it.importe; }
    return { nombre: f.nombre, n: f.n, v, c, t: v + c };
  });
  const total = fases.reduce((s, f) => s + f.t, 0);
  const max = total * 1.08;
  const n = fases.length + 1, slot = (W - ml - mr) / n, bw = slot * 0.62;
  const y = (val) => mt + (H - mt - mb) * (1 - val / max);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico en cascada de costes por fase. Total ${fmtEUR(total, 0)}">`;
  // rejilla
  const paso = niceStep(max / 5);
  for (let g = 0; g <= max; g += paso) {
    svg += `<line x1="${ml}" x2="${W - mr}" y1="${y(g)}" y2="${y(g)}" stroke="rgba(140,170,210,0.15)"/><text x="${ml - 8}" y="${y(g) + 4}" text-anchor="end" font-size="11">${fmtNum(g)} €</text>`;
  }
  let acum = 0;
  fases.forEach((f, i) => {
    const x = ml + slot * i + (slot - bw) / 2;
    const y0 = y(acum), yv = y(acum + f.v), yc = y(acum + f.t);
    if (f.v > 0) svg += `<rect x="${x}" y="${yv}" width="${bw}" height="${Math.max(0.5, y0 - yv)}" fill="#5aa9e6" rx="2"><title>${esc(f.nombre)} · vendedor ${fmtEUR(f.v)}</title></rect>`;
    if (f.c > 0) svg += `<rect x="${x}" y="${yc}" width="${bw}" height="${Math.max(0.5, yv - yc)}" fill="#f08a3c" rx="2"><title>${esc(f.nombre)} · comprador ${fmtEUR(f.c)}</title></rect>`;
    if (i < fases.length) svg += `<line x1="${x + bw}" x2="${x + slot}" y1="${yc}" y2="${yc}" stroke="rgba(200,215,235,0.35)" stroke-dasharray="3 3"/>`;
    svg += `<text class="num" x="${x + bw / 2}" y="${yc - 7}" text-anchor="middle">${fmtNum(f.t)}</text>`;
    svg += `<text x="${x + bw / 2}" y="${H - mb + 18}" text-anchor="middle" font-size="12" font-weight="600">${f.n}</text>`;
    svg += wrapLabel(f.nombre, x + bw / 2, H - mb + 34);
    acum += f.t;
  });
  // total
  const xt = ml + slot * fases.length + (slot - bw) / 2;
  const tv = fases.reduce((s, f) => s + f.v, 0);
  svg += `<rect x="${xt}" y="${y(tv)}" width="${bw}" height="${y(0) - y(tv)}" fill="#5aa9e6" rx="2"/><rect x="${xt}" y="${y(total)}" width="${bw}" height="${y(tv) - y(total)}" fill="#f08a3c" rx="2"/>`;
  svg += `<rect x="${xt - 2}" y="${y(total) - 2}" width="${bw + 4}" height="${y(0) - y(total) + 4}" fill="none" stroke="#fff" stroke-opacity=".5" rx="3"/>`;
  svg += `<text class="num" x="${xt + bw / 2}" y="${y(total) - 8}" text-anchor="middle" font-weight="700">${fmtNum(total)}</text>`;
  svg += `<text x="${xt + bw / 2}" y="${H - mb + 18}" text-anchor="middle" font-size="12" font-weight="700">Total</text>`;
  // leyenda
  svg += `<g transform="translate(${ml},10)"><rect width="10" height="10" fill="#5aa9e6" rx="2"/><text x="16" y="9" font-size="12">Vendedor</text><rect x="90" width="10" height="10" fill="#f08a3c" rx="2"/><text x="106" y="9" font-size="12">Comprador</text></g>`;
  svg += `<line x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}" stroke="rgba(200,215,235,0.4)"/>`;
  return svg + '</svg>';
}
/** Cascada en filas (pantallas estrechas): cada fase es una barra horizontal que arranca donde acabó la anterior. */
function cascadaVertical(calc, incluirIVA) {
  const fases = calc.fases.map((f) => {
    let v = 0, c = 0;
    for (const it of f.items) { if (it.tipo === 'mercancia' || (!incluirIVA && it.deducible)) continue; if (it.pagadorActual === 'vendedor') v += it.importe; else c += it.importe; }
    return { nombre: f.nombre, n: f.n, v, c, t: v + c };
  });
  const total = fases.reduce((s, f) => s + f.t, 0);
  const W = 360, fila = 40, ml = 8, mr = 8, H = (fases.length + 1) * fila + 28;
  const x = (val) => ml + (W - ml - mr) * (val / total);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico en cascada de costes por fase. Total ${fmtEUR(total, 0)}">`;
  svg += `<g transform="translate(${ml},12)"><rect width="10" height="10" fill="#5aa9e6" rx="2"/><text x="15" y="9" font-size="11">Vendedor</text><rect x="86" width="10" height="10" fill="#f08a3c" rx="2"/><text x="101" y="9" font-size="11">Comprador</text></g>`;
  let acum = 0;
  fases.forEach((f, i) => {
    const y = 30 + i * fila;
    svg += `<text x="${ml}" y="${y + 11}" font-size="11.5">${f.n}. ${esc(f.nombre)}</text><text class="num" x="${W - mr}" y="${y + 11}" text-anchor="end">${fmtNum(f.t)} €</text>`;
    if (f.v > 0) svg += `<rect x="${x(acum)}" y="${y + 17}" width="${Math.max(1.5, x(acum + f.v) - x(acum))}" height="14" fill="#5aa9e6" rx="2"/>`;
    if (f.c > 0) svg += `<rect x="${x(acum + f.v)}" y="${y + 17}" width="${Math.max(1.5, x(acum + f.t) - x(acum + f.v))}" height="14" fill="#f08a3c" rx="2"/>`;
    acum += f.t;
  });
  const y = 30 + fases.length * fila;
  const tv = fases.reduce((s, f) => s + f.v, 0);
  svg += `<text x="${ml}" y="${y + 11}" font-size="12" font-weight="700">Total</text><text class="num" x="${W - mr}" y="${y + 11}" text-anchor="end" font-weight="700">${fmtNum(total)} €</text>`;
  svg += `<rect x="${x(0)}" y="${y + 17}" width="${x(tv) - x(0)}" height="16" fill="#5aa9e6" rx="2"/><rect x="${x(tv)}" y="${y + 17}" width="${x(total) - x(tv)}" height="16" fill="#f08a3c" rx="2"/>`;
  return svg + '</svg>';
}
function wrapLabel(t, x, y) {
  const words = t.split(' '); const l1 = [], l2 = [];
  words.forEach((w) => ((l1.join(' ') + ' ' + w).length < 12 && !l2.length ? l1.push(w) : l2.push(w)));
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="11">${esc(l1.join(' '))}</text>${l2.length ? `<text x="${x}" y="${y + 14}" text-anchor="middle" font-size="11">${esc(l2.join(' '))}</text>` : ''}`;
}
function niceStep(s) { const p = Math.pow(10, Math.floor(Math.log10(s))); const m = s / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

/* ---------- Toast ---------- */
let toastT = 0;
export function toast(msg, ms = 3800) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms);
}
