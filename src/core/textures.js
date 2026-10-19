/* =====================================================================
 *  TEXTURAS PROCEDURALES (canvas) — PBR: color, rugosidad y normales.
 *  Todas son ficticias y se generan en el arranque; se cachean.
 * ===================================================================== */
import * as THREE from 'three';

const cache = new Map();
let ANISO = 4;
export function setAnisotropy(n) { ANISO = n; }

/* ---------- Ruido de valor periódico (tileable) ---------- */
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const x0 = ((xi % period) + period) % period, x1 = (x0 + 1) % period;
  const y0 = ((yi % period) + period) % period, y1 = (y0 + 1) % period;
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** fbm periódico en [0,1]. u,v en [0,1). */
export function fbm(u, v, { base = 4, oct = 5, seed = 1, gain = 0.5, sx = 1, sy = 1 } = {}) {
  let amp = 0.5, sum = 0, norm = 0, f = base;
  for (let o = 0; o < oct; o++) {
    const px = Math.max(1, Math.round(f * sx)), py = Math.max(1, Math.round(f * sy));
    sum += amp * vnoise(u * px, v * py, Math.min(px, py) === px ? px : px, seed + o * 31) * 1;
    norm += amp; amp *= gain; f *= 2;
  }
  return sum / norm;
}
// Variante con periodo independiente por eje
function fbm2(u, v, bx, by, oct, seed, gain = 0.5) {
  let amp = 0.5, sum = 0, norm = 0, fx = bx, fy = by;
  for (let o = 0; o < oct; o++) {
    const px = Math.max(1, Math.round(fx)), py = Math.max(1, Math.round(fy));
    const x = u * px, y = v * py;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
    const y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const s = seed + o * 31;
    const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
    const uu = smooth(xf), vv = smooth(yf);
    sum += amp * (a + (b - a) * uu + (c - a) * vv + (a - b - c + d) * uu * vv);
    norm += amp; amp *= gain; fx *= 2; fy *= 2;
  }
  return sum / norm;
}

/* ---------- Utilidades canvas → textura ---------- */
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
export function toTex(cv, { srgb = true, repeat = [1, 1], wrap = true } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = ANISO;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}
/** Normal map a partir de un campo de alturas Float32Array (tileable). */
function normalFromHeight(h, w, hh, strength = 2) {
  const cv = canvas(w, hh), ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const l = h[y * w + ((x - 1 + w) % w)], r = h[y * w + ((x + 1) % w)];
      const u = h[((y - 1 + hh) % hh) * w + x], d = h[((y + 1) % hh) * w + x];
      let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
function grayCanvas(fn, w, h) {
  const cv = canvas(w, h), ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(1, fn(x / w, y / h)));
    const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
function colorCanvas(fn, w, h) {
  const cv = canvas(w, h), ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const out = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    fn(x / w, y / h, out);
    const i = (y * w + x) * 4;
    img.data[i] = out[0] * 255; img.data[i + 1] = out[1] * 255; img.data[i + 2] = out[2] * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* =====================================================================
 *  Texturas concretas
 * ===================================================================== */

/** Pintura de contenedor envejecida: blanco cálido con chorretones y óxido.
 *  Se multiplica por el color del material/instancia. u = horizontal, v = vertical (0 arriba). */
export function containerGrime(oxido = 1) {
  return cached('grime' + oxido, () => {
    const S = 512;
    const rough = new Float32Array(S * S);
    const col = colorCanvas((u, v, o) => {
      const streak = fbm2(u, v, 48, 2, 4, 7); // chorretones verticales
      const blot = fbm2(u, v, 6, 6, 5, 3);
      const rust = Math.max(0, fbm2(u, v, 10, 10, 5, 11) - 0.66) * 3.2 * oxido; // manchas de óxido
      const edge = Math.pow(Math.max(0, 1 - v * 1.4), 6) * 0.25 + Math.pow(Math.max(0, v - 0.86) / 0.14, 2) * 0.35; // suciedad arriba/abajo
      let dirt = ((streak - 0.5) * 0.3 + (blot - 0.5) * 0.12 + edge) * (0.5 + oxido * 0.5);
      dirt = Math.max(0, dirt);
      const base = 0.92 - dirt * 0.55;
      const r = Math.min(1, rust);
      o[0] = base * (1 - r) + 0.42 * r;
      o[1] = base * (1 - r) + 0.22 * r;
      o[2] = base * (1 - r) + 0.12 * r;
      rough[Math.floor(v * S) * S + Math.floor(u * S)] = 0.5 + dirt * 0.6 + r * 0.3;
    }, S, S);
    const rcv = grayCanvas((u, v) => rough[Math.floor(v * S) * S + Math.floor(u * S)], S, S);
    return { map: toTex(col), roughnessMap: toTex(rcv, { srgb: false }) };
  });
}

/** Normal de chapa ondulada (costillas en U). count = costillas por repetición. */
export function ribsNormal(count = 8, sharp = 2.5) {
  return cached('ribs' + count + sharp, () => {
    const W = 256, H = 16;
    const h = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = (x / W) * count;
      const f = p - Math.floor(p);
      // perfil trapezoidal suavizado
      const t = Math.min(1, Math.max(0, (Math.abs(f - 0.5) - 0.1) * 3.2));
      h[y * W + x] = 1 - t;
    }
    return toTex(normalFromHeight(h, W, H, sharp), { srgb: false });
  });
}

/** Hormigón de muelle con juntas y manchas. */
export function concrete() {
  return cached('concrete', () => {
    const S = 512;
    const h = new Float32Array(S * S);
    const col = colorCanvas((u, v, o) => {
      const n = fbm(u, v, { base: 8, oct: 6, seed: 21 });
      const st = fbm(u, v, { base: 3, oct: 4, seed: 5 });
      const fine = hash(Math.floor(u * S), Math.floor(v * S), 9);
      const joint = (Math.min(u % 0.5, 0.5 - (u % 0.5)) < 0.003 || Math.min(v % 0.5, 0.5 - (v % 0.5)) < 0.003) ? 0.5 : 0;
      let c = 0.58 + (n - 0.5) * 0.18 + (fine - 0.5) * 0.06 - Math.max(0, st - 0.55) * 0.6 - joint * 0.25;
      o[0] = c * 0.98; o[1] = c * 0.97; o[2] = c * 0.94;
      h[Math.floor(v * S) * S + Math.floor(u * S)] = n * 0.6 + fine * 0.1 - joint * 0.8;
    }, S, S);
    const rcv = grayCanvas((u, v) => 0.82 + (fbm(u, v, { base: 4, oct: 3, seed: 2 }) - 0.5) * 0.3, 128, 128);
    return { map: toTex(col), roughnessMap: toTex(rcv, { srgb: false }), normalMap: toTex(normalFromHeight(h, S, S, 3), { srgb: false }) };
  });
}

/** Asfalto con árido. */
export function asphalt() {
  return cached('asphalt', () => {
    const S = 512;
    const h = new Float32Array(S * S);
    const col = colorCanvas((u, v, o) => {
      const n = fbm(u, v, { base: 16, oct: 5, seed: 41 });
      const g = hash(Math.floor(u * S), Math.floor(v * S), 3);
      const patch = fbm(u, v, { base: 3, oct: 3, seed: 8 });
      const c = 0.2 + (n - 0.5) * 0.08 + (g > 0.93 ? 0.12 : 0) + (patch - 0.5) * 0.06;
      o[0] = c; o[1] = c; o[2] = c * 1.02;
      h[Math.floor(v * S) * S + Math.floor(u * S)] = g * 0.5 + n * 0.5;
    }, S, S);
    return { map: toTex(col), normalMap: toTex(normalFromHeight(h, S, S, 1.5), { srgb: false }) };
  });
}

/** Madera (vetas). dark=true para escritorio nogal. */
export function wood(kind = 'roble') {
  return cached('wood' + kind, () => {
    const W = 512, H = 512;
    const base = kind === 'nogal' ? [0.32, 0.19, 0.11] : [0.62, 0.45, 0.30];
    const h = new Float32Array(W * H);
    const planks = kind === 'nogal' ? 1 : 6;
    const col = colorCanvas((u, v, o) => {
      const pk = Math.floor(v * planks);
      const pv = v * planks - pk;
      const off = hash(pk, 0, 5);
      const ring = Math.sin((fbm2(u + off, pv * 0.15, 3, 2, 4, 12 + pk) * 18 + v * 6) * Math.PI);
      const grain = fbm2(u + off, v, 64, 4, 3, 33 + pk);
      const tone = 0.85 + hash(pk, 1, 9) * 0.25;
      const g = 0.82 + ring * 0.08 + (grain - 0.5) * 0.18;
      const seam = planks > 1 && (pv < 0.008 || pv > 0.992) ? 0.55 : 1;
      o[0] = base[0] * g * tone * seam; o[1] = base[1] * g * tone * seam; o[2] = base[2] * g * tone * seam;
      h[Math.floor(v * H) * W + Math.floor(u * W)] = grain * 0.3 + (seam < 1 ? -1 : 0);
    }, W, H);
    const rough = grayCanvas((u, v) => 0.5 + (fbm2(u, v, 64, 4, 3, 2) - 0.5) * 0.25, 256, 256);
    return { map: toTex(col), normalMap: toTex(normalFromHeight(h, W, H, 1.2), { srgb: false }), roughnessMap: toTex(rough, { srgb: false }) };
  });
}

/** Normal de agua tileable (para el shader Water). */
export function waterNormals() {
  return cached('water', () => {
    const S = 512;
    const h = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      h[y * S + x] = fbm(u, v, { base: 6, oct: 6, seed: 77, gain: 0.55 });
    }
    const t = toTex(normalFromHeight(h, S, S, 9), { srgb: false });
    return t;
  });
}

/** Sprite de humo / polvo (alfa radial con ruido). */
export function smokeSprite() {
  return cached('smoke', () => {
    const S = 128, cv = canvas(S, S), ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x / S - 0.5, dy = y / S - 0.5;
      const d = Math.hypot(dx, dy) * 2;
      const n = fbm(x / S, y / S, { base: 4, oct: 4, seed: 4 });
      const a = Math.max(0, 1 - d) ** 1.6 * (0.55 + n * 0.6);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * 255);
    }
    ctx.putImageData(img, 0, 0);
    const t = toTex(cv, { wrap: false });
    return t;
  });
}

/** Cartón de cajas con cinta y etiqueta. */
export function cardboard() {
  return cached('cardboard', () => {
    const S = 256, cv = colorCanvas((u, v, o) => {
      const n = fbm(u, v, { base: 8, oct: 4, seed: 61 });
      const c = 0.78 + (n - 0.5) * 0.12;
      o[0] = 0.72 * c; o[1] = 0.55 * c; o[2] = 0.36 * c;
    }, S, S);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(205,175,120,0.9)'; ctx.fillRect(S * 0.44, 0, S * 0.12, S); // cinta
    ctx.fillStyle = '#f2efe6'; ctx.fillRect(S * 0.08, S * 0.62, S * 0.3, S * 0.22); // etiqueta
    ctx.fillStyle = '#222'; for (let i = 0; i < 6; i++) ctx.fillRect(S * 0.1, S * (0.65 + i * 0.03), S * (0.12 + (i % 3) * 0.05), 2);
    ctx.font = 'bold 18px Inter, Arial'; ctx.fillStyle = '#3a2a18'; ctx.fillText('NOVA-12', S * 0.6, S * 0.3);
    ctx.font = '12px Inter, Arial'; ctx.fillText('↑↑  FRÁGIL', S * 0.6, S * 0.4);
    return toTex(cv, { wrap: false });
  });
}

/** Rejilla de ventanas iluminadas (emisiva). */
export function windows({ cols = 12, rows = 4, lit = 0.6, warm = true, seed = 3 } = {}) {
  return cached(`win${cols}${rows}${lit}${warm}${seed}`, () => {
    const W = cols * 32, H = rows * 32, cv = canvas(W, H), ctx = cv.getContext('2d');
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = hash(c, r, seed) < lit;
      const k = 0.6 + hash(c, r, seed + 1) * 0.4;
      ctx.fillStyle = on ? (warm ? `rgba(255,${190 + 40 * k | 0},${120 + 60 * k | 0},${k})` : `rgba(${190 * k | 0},${225 * k | 0},255,${k})`) : '#0d1218';
      ctx.fillRect(c * 32 + 4, r * 32 + 6, 24, 20);
    }
    return toTex(cv, { wrap: false });
  });
}

/** Franjas de advertencia amarillo/negro. */
export function hazard() {
  return cached('hazard', () => {
    const cv = canvas(128, 128), ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8b400'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#141414';
    for (let i = -2; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 32, 0); ctx.lineTo(i * 64 + 160, 128); ctx.lineTo(i * 64 + 128, 128); ctx.closePath(); ctx.fill(); }
    return toTex(cv);
  });
}

/** Panel de texto (carteles, pantallas, etiquetas). Se dibuja con una función. */
export function textPanel(key, w, h, draw, opts = {}) {
  return cached('txt' + key, () => {
    const cv = canvas(w, h); const ctx = cv.getContext('2d');
    draw(ctx, w, h);
    const t = toTex(cv, { wrap: false, ...opts });
    t.userData.canvas = cv; t.userData.draw = draw;
    return t;
  });
}

/** Rótulo de contenedor: logo naviera + matrícula BIC ficticia (fondo transparente). */
export function containerDecal(name = 'OCEANIS', code = 'OCNU 482913 6', color = '#f4f4f0') {
  return textPanel('decal' + name + code + color, 1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    let fs = 150; ctx.font = `800 ${fs}px Inter, Arial`;
    const ola = 230; // ancho del logotipo de ola + separación
    const tw = ctx.measureText(name).width;
    if (tw + ola > w - 40) { fs = Math.floor(fs * (w - 40 - ola) / tw); ctx.font = `800 ${fs}px Inter, Arial`; }
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 30, h * 0.5);
    ctx.lineWidth = 16 * fs / 150; ctx.strokeStyle = color; ctx.beginPath();
    const x0 = 30 + ctx.measureText(name).width + 40;
    for (let i = 0; i <= 40; i++) { const x = x0 + i * 4.5; const y = h * 0.5 + Math.sin(i / 40 * Math.PI * 2) * 22 * fs / 150; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  });
}
/** Fachada con ventanas: map (pared clara + cristal oscuro) y emissive (solo ventanas encendidas). */
export function windowsPair({ cols = 12, rows = 4, lit = 0.5, warm = true, seed = 3, pared = '#d9dbd8' } = {}) {
  return cached(`winp${cols}${rows}${lit}${warm}${seed}${pared}`, () => {
    const W = cols * 32, H = rows * 32;
    const a = canvas(W, H), b = canvas(W, H);
    const ca = a.getContext('2d'), cb = b.getContext('2d');
    ca.fillStyle = pared; ca.fillRect(0, 0, W, H);
    cb.fillStyle = '#000'; cb.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = hash(c, r, seed) < lit;
      const k = 0.6 + hash(c, r, seed + 1) * 0.4;
      ca.fillStyle = '#1a2430'; ca.fillRect(c * 32 + 4, r * 32 + 8, 24, 16);
      ca.fillStyle = 'rgba(160,190,215,0.35)'; ca.fillRect(c * 32 + 4, r * 32 + 8, 24, 5);
      if (on) { cb.fillStyle = warm ? `rgba(255,${190 + 40 * k | 0},${120 + 60 * k | 0},1)` : `rgba(${190 * k | 0},${225 * k | 0},255,1)`; cb.globalAlpha = k; cb.fillRect(c * 32 + 4, r * 32 + 8, 24, 16); cb.globalAlpha = 1; }
    }
    return { map: toTex(a, { wrap: false }), emissive: toTex(b, { wrap: false }) };
  });
}
export function containerCode(code = 'OCNU 482913 6', color = '#f4f4f0') {
  return textPanel('code' + code + color, 512, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.textBaseline = 'top';
    ctx.font = '700 62px "JetBrains Mono", monospace'; ctx.fillText(code, 10, 10);
    ctx.font = '600 40px "JetBrains Mono", monospace'; ctx.fillText('45G1', 10, 92);
    ctx.font = '500 22px "JetBrains Mono", monospace'; ctx.fillText('MAX GR 32.500 KG  TARE 3.900 KG', 140, 104);
  });
}

/** Césped/terreno (color) tileable. */
export function grass() {
  return cached('grass', () => {
    const S = 512;
    const col = colorCanvas((u, v, o) => {
      const n = fbm(u, v, { base: 8, oct: 6, seed: 91 });
      const m = fbm(u, v, { base: 2, oct: 3, seed: 13 });
      const g = hash(Math.floor(u * S), Math.floor(v * S), 2);
      const dry = Math.max(0, m - 0.5) * 1.6;
      const k = 0.75 + (n - 0.5) * 0.5 + (g - 0.5) * 0.15;
      o[0] = (0.22 + dry * 0.25) * k; o[1] = (0.34 + dry * 0.12) * k; o[2] = (0.12 + dry * 0.05) * k;
    }, S, S);
    return toTex(col);
  });
}
/** Malla metálica de valla (alfa). */
export function fence() {
  return cached('fence', () => {
    const S = 128, cv = canvas(S, S), ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, S, S); ctx.strokeStyle = 'rgba(200,205,210,1)'; ctx.lineWidth = 3;
    for (let i = -S; i < S * 2; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, S); ctx.lineTo(i + S, 0); ctx.stroke(); }
    return toTex(cv, { srgb: true });
  });
}
/** Yeso de pared interior. */
export function plaster() {
  return cached('plaster', () => {
    const S = 256;
    const col = colorCanvas((u, v, o) => { const n = fbm(u, v, { base: 8, oct: 5, seed: 71 }); const c = 0.86 + (n - 0.5) * 0.06; o[0] = c; o[1] = c * 0.985; o[2] = c * 0.955; }, S, S);
    return toTex(col);
  });
}
