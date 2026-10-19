/* =====================================================================
 *  CÁMARA — vuelos cinematográficos (curva con arco y easing), órbita con
 *  límites por escena y modo "vista libre".
 * ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.6;
    this.controls.screenSpacePanning = true;
    this.controls.keys = { LEFT: 'KeyA', UP: 'KeyW', RIGHT: 'KeyD', BOTTOM: 'KeyS' };
    this.vuelo = null;
    this.libre = false;
    this.limites = null;
    this.caja = null;
    this._t = new THREE.Vector3();
  }
  /** Límites de órbita de la escena. */
  setLimites(l) {
    this.limites = l;
    this.aplicarLimites();
  }
  aplicarLimites() {
    const c = this.controls, l = this.limites || {};
    if (this.libre) {
      c.minDistance = 1; c.maxDistance = (l.maxDist || 100) * 3;
      c.minPolarAngle = 0.05; c.maxPolarAngle = Math.PI * 0.495;
      c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity;
      c.enablePan = true;
      this.caja = l.caja ? l.caja.clone().expandByScalar(l.maxDist || 50) : null;
    } else {
      c.minDistance = l.minDist ?? 2; c.maxDistance = l.maxDist ?? 60;
      c.minPolarAngle = l.minPolar ?? 0.15; c.maxPolarAngle = l.maxPolar ?? Math.PI * 0.46;
      c.minAzimuthAngle = l.minAzim ?? -Infinity; c.maxAzimuthAngle = l.maxAzim ?? Infinity;
      c.enablePan = l.pan ?? true;
      this.caja = l.caja ? l.caja.clone() : null;
    }
  }
  setLibre(v) { this.libre = v; this.aplicarLimites(); }
  /** Coloca la cámara sin animación. */
  saltar(pos, target) {
    this.vuelo = null;
    this.camera.position.copy(pos); this.controls.target.copy(target);
    this.camera.lookAt(target); this.controls.update();
  }
  /** Vuelo suave hacia pos/target. */
  volar(pos, target, { dur = 2.2, arco = 0.12, alTerminar } = {}) {
    if (reducido()) { this.saltar(pos, target); alTerminar && alTerminar(); return; }
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    const dist = p0.distanceTo(pos);
    const mid = p0.clone().lerp(pos, 0.5); mid.y += dist * arco;
    // aleja ligeramente el punto medio del objetivo para un movimiento envolvente
    const away = mid.clone().sub(t0.clone().lerp(target, 0.5)).setY(0).normalize().multiplyScalar(dist * arco * 0.5);
    mid.add(away);
    this.vuelo = { curva: new THREE.QuadraticBezierCurve3(p0, mid, pos.clone()), t0, t1: target.clone(), dur, t: 0, alTerminar };
    this.controls.enabled = false;
  }
  get volando() { return !!this.vuelo; }
  update(dt) {
    if (this.vuelo) {
      const v = this.vuelo;
      v.t = Math.min(1, v.t + dt / v.dur);
      const k = ease(v.t);
      v.curva.getPoint(k, this.camera.position);
      this._t.copy(v.t0).lerp(v.t1, k);
      this.controls.target.copy(this._t);
      this.camera.lookAt(this._t);
      if (v.t >= 1) {
        this.vuelo = null; this.controls.enabled = true; this.controls.update();
        v.alTerminar && v.alTerminar();
      }
      return;
    }
    this.controls.update();
    if (this.caja) {
      const before = this.controls.target.clone();
      this.caja.clampPoint(this.controls.target, this.controls.target);
      const d = this.controls.target.clone().sub(before);
      if (d.lengthSq() > 0) this.camera.position.add(d);
    }
    if (this.camera.position.y < 0.3) this.camera.position.y = 0.3;
  }
}
