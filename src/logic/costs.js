/* =====================================================================
 *  LÓGICA DE COSTES
 *  Calcula importes, pagador según Incoterm, valor en aduana, arancel e
 *  IVA a partir de DATA. Sin dependencias de Three.js ni del DOM.
 * ===================================================================== */
import { DATA, INCOTERMS_ORDEN } from '../data.js';

const round2 = (n) => Math.round(n * 100) / 100;

export const fmtEUR = (n, dec = 2) =>
  new Intl.NumberFormat(DATA.meta.locale, {
    style: 'currency', currency: DATA.meta.moneda,
    minimumFractionDigits: dec, maximumFractionDigits: dec,
    useGrouping: 'always',
  }).format(n);

export const fmtNum = (n, dec = 0) =>
  new Intl.NumberFormat(DATA.meta.locale, { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' }).format(n);

/** Devuelve 'vendedor' | 'comprador' para una partida y un Incoterm. */
export function pagadorDe(clave, incoterm) {
  const c = DATA.costes[clave];
  const idx = INCOTERMS_ORDEN.indexOf(incoterm);
  const letra = (c.pagador || 'CCCCC')[idx] || 'C';
  return letra === 'V' ? 'vendedor' : 'comprador';
}

/**
 * Calcula todas las partidas para un estado { incoterm, canal }.
 * Devuelve { items: {clave: {...}}, valorAduana, arancel, baseIVA, iva, ... }
 */
export function calcular(estado) {
  const { incoterm, canal } = estado;
  const op = DATA.operacion;
  const items = {};

  // 1) Importes directos
  for (const [k, c] of Object.entries(DATA.costes)) {
    let importe = 0;
    if (typeof c.importe === 'number') importe = c.importe;
    else if (c.porCanal) importe = c.porCanal[canal] ?? 0;
    items[k] = { clave: k, ...c, importe, pagadorActual: pagadorDe(k, incoterm) };
  }

  // 2) Valor en aduana = suma de partidas hasta la entrada en la UE
  const valorAduana = round2(Object.values(items).filter((i) => i.valorAduana).reduce((s, i) => s + i.importe, 0));
  const arancel = round2(valorAduana * op.partida.arancel);
  items.arancel.importe = arancel;

  // 3) Base IVA = valor en aduana + arancel + gastos accesorios hasta el primer destino
  const accesorios = round2(Object.values(items).filter((i) => i.baseIVA).reduce((s, i) => s + i.importe, 0));
  const baseIVA = round2(valorAduana + arancel + accesorios);
  const iva = round2(baseIVA * op.iva);
  items.iva.importe = iva;

  // 4) Totales por fase y pagador
  const fases = DATA.fases.map((f) => ({ ...f, total: 0, vendedor: 0, comprador: 0, sinIVA: 0, items: [] }));
  for (const it of Object.values(items)) {
    const f = fases[it.fase - 1];
    f.items.push(it);
    f.total += it.importe;
    f[it.pagadorActual] += it.importe;
    if (!it.deducible) f.sinIVA += it.importe;
  }
  fases.forEach((f) => { f.total = round2(f.total); f.vendedor = round2(f.vendedor); f.comprador = round2(f.comprador); f.sinIVA = round2(f.sinIVA); });

  const mercancia = items.mercancia.importe;
  const totalConIVA = round2(fases.reduce((s, f) => s + f.total, 0));
  const totalSinIVA = round2(totalConIVA - iva);
  const costesSinIVA = round2(totalSinIVA - mercancia);

  return {
    estado: { ...estado }, items, fases, valorAduana, arancel, accesorios, baseIVA, iva,
    mercancia, totalConIVA, totalSinIVA, costesSinIVA,
    porUnidad: round2(totalSinIVA / op.mercancia.unidades),
  };
}

/** Acumulado hasta la fase n (incluida). */
export function acumulado(calc, n, { incluirIVA = true } = {}) {
  let total = 0, vendedor = 0, comprador = 0;
  for (const f of calc.fases.slice(0, n)) {
    for (const it of f.items) {
      if (!incluirIVA && it.deducible) continue;
      total += it.importe;
      if (it.pagadorActual === 'vendedor') vendedor += it.importe; else comprador += it.importe;
    }
  }
  return { total: round2(total), vendedor: round2(vendedor), comprador: round2(comprador) };
}
