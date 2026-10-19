/* =====================================================================
 *  CALIDAD GRÁFICA — perfiles Alta / Media / Baja y detección automática
 * ===================================================================== */

export const PERFILES = {
  alta:  { id: 'alta',  nombre: 'Alta',  pixelRatio: 2,   shadowMap: 2048, sombras: true, ao: true,  bloom: true,  msaa: 4, agua: 512, densidad: 1.0, particulas: 1.0, anisotropia: 8 },
  media: { id: 'media', nombre: 'Media', pixelRatio: 1.5, shadowMap: 1024, sombras: true, ao: false, bloom: true,  msaa: 2, agua: 256, densidad: 0.7, particulas: 0.6, anisotropia: 4 },
  baja:  { id: 'baja',  nombre: 'Baja',  pixelRatio: 1,   shadowMap: 512,  sombras: true, ao: false, bloom: false, msaa: 0, agua: 128, densidad: 0.45, particulas: 0.3, anisotropia: 2 },
};

/** Intenta adivinar la capacidad del equipo sin medir. */
export function detectarCalidad(renderer) {
  const url = new URLSearchParams(location.search).get('calidad');
  if (url && PERFILES[url]) return { id: url, motivo: 'parámetro de URL' };

  let gpu = '';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch (e) { /* sin información */ }
  gpu = String(gpu || '');

  const movil = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
  const nucleos = navigator.hardwareConcurrency || 4;
  const memoria = navigator.deviceMemory || 4;

  if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu)) return { id: 'baja', motivo: 'render por software', gpu };
  if (movil) return { id: memoria >= 6 && nucleos >= 8 ? 'media' : 'baja', motivo: 'dispositivo móvil', gpu };
  if (/NVIDIA|GeForce|RTX|Radeon RX|Radeon Pro|Apple M[1-9]|Apple GPU/i.test(gpu)) return { id: 'alta', motivo: 'GPU dedicada', gpu };
  if (nucleos <= 4 || memoria <= 4) return { id: 'baja', motivo: 'equipo modesto', gpu };
  return { id: 'media', motivo: 'GPU integrada', gpu };
}

/** Mide FPS de forma continua; avisa si conviene bajar la calidad. */
export class MedidorFPS {
  constructor() { this.frames = 0; this.t0 = performance.now(); this.fps = 60; this.lentos = 0; }
  tick() {
    this.frames++;
    const t = performance.now();
    if (t - this.t0 >= 1000) {
      this.fps = (this.frames * 1000) / (t - this.t0);
      this.frames = 0; this.t0 = t;
      this.lentos = this.fps < 26 ? this.lentos + 1 : 0;
      return true;
    }
    return false;
  }
}
