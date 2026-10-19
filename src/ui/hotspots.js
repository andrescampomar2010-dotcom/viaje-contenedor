/* =====================================================================
 *  HOTSPOTS — botones HTML anclados a objetos 3D (accesibles por teclado,
 *  con texto alternativo), pulso animado y tooltip.
 * ===================================================================== */
import * as THREE from 'three';

const CHECK = '<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

export class Hotspots {
  constructor(capa, tooltip) {
    this.capa = capa; this.tooltip = tooltip;
    this.items = []; this.visto = new Set();
    this._v = new THREE.Vector3();
    this.activo = null;
  }
  /** lista: [{id, titulo, alt, resumen}], anclas: {id: Object3D} */
  set(lista, anclas, { onAbrir, faseId }) {
    this.capa.innerHTML = '';
    this.items = [];
    this.faseId = faseId;
    lista.forEach((h, i) => {
      const a = anclas[h.id];
      if (!a) return;
      const b = document.createElement('button');
      b.className = 'hs' + (this.visto.has(faseId + ':' + h.id) ? ' visto' : '');
      b.type = 'button';
      b.innerHTML = `<span class="num">${i + 1}</span>${CHECK}`;
      b.setAttribute('aria-label', `${i + 1}. ${h.titulo}: ${h.alt}${h.resumen ? '. ' + h.resumen : ''}`);
      b.dataset.id = h.id;
      b.addEventListener('click', () => onAbrir(h.id));
      const show = () => this.mostrarTip(b, h);
      const hide = () => this.ocultarTip();
      b.addEventListener('pointerenter', show); b.addEventListener('pointerleave', hide);
      b.addEventListener('focus', show); b.addEventListener('blur', hide);
      this.capa.appendChild(b);
      this.items.push({ h, a, b });
    });
  }
  marcarVisto(id) {
    this.visto.add(this.faseId + ':' + id);
    const it = this.items.find((x) => x.h.id === id); if (it) it.b.classList.add('visto');
  }
  setActivo(id) {
    this.activo = id;
    for (const it of this.items) it.b.classList.toggle('activo', it.h.id === id);
  }
  mostrarTip(b, h) {
    this.tip = { b, h };
    this.tooltip.innerHTML = `<strong>${h.titulo}</strong>${h.resumen ? `<span>${h.resumen}</span>` : ''}`;
    this.tooltip.hidden = false;
    this.posTip();
  }
  posTip() {
    if (!this.tip || this.tooltip.hidden) return;
    const r = this.tip.b.getBoundingClientRect();
    this.tooltip.style.left = `${r.left + r.width / 2}px`;
    this.tooltip.style.top = `${r.top + r.height / 2}px`;
  }
  ocultarTip() { this.tip = null; this.tooltip.hidden = true; }
  /** Proyecta cada ancla a pantalla. */
  update(camera, w, h, ocultarTodo = false) {
    for (const it of this.items) {
      it.a.getWorldPosition(this._v);
      this._v.project(camera);
      const vis = !ocultarTodo && this._v.z < 1 && Math.abs(this._v.x) < 1.05 && Math.abs(this._v.y) < 1.05;
      const x = (this._v.x * 0.5 + 0.5) * w, y = (-this._v.y * 0.5 + 0.5) * h;
      it.b.style.left = `${x.toFixed(1)}px`; it.b.style.top = `${y.toFixed(1)}px`;
      it.b.classList.toggle('oculto', !vis);
      it.b.tabIndex = vis ? 0 : -1;
    }
    this.posTip();
  }
  ids() { return this.items.map((x) => x.h.id); }
  enfocar(id) { const it = this.items.find((x) => x.h.id === id); if (it) it.b.focus({ preventScroll: true }); }
}
