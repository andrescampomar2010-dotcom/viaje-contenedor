# El viaje de un contenedor

Recorrido 3D interactivo por la logística y las aduanas de una importación marítima: del contrato a la libre circulación, en 7 escenas (oficina, almacén de origen, terminal de origen, alta mar, terminal de destino, aduana y entrega) y un resumen de costes con Incoterms.

**Demo:** https://andrescampomar2010-dotcom.github.io/viaje-contenedor/

Todo el contenido es **ficticio** (empresas, puertos, buques, importes, documentos y códigos) y tiene fines didácticos. Hecho con Three.js (r186, incluido en `src/vendor/three`, licencia MIT) y JavaScript sin dependencias de compilación.

## Cómo abrirlo en local

Hace falta un servidor local (los módulos ES no cargan desde `file://`):

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000/>. Parámetros útiles: `?calidad=alta|media|baja` y `?auto` (salta la pantalla de inicio).

## Estructura

- `src/data.js`: datos editables (importes, Incoterms, textos).
- `src/scenes/`: una escena por fase.
- `src/builders/`: modelos procedurales (contenedor, grúa, buque, oficina...).
- `assets/fonts/`: Inter y JetBrains Mono (SIL OFL 1.1).

## Licencias

Código propio: MIT (ver `LICENSE`). Three.js: MIT (`src/vendor/three/LICENSE`). Fuentes: SIL OFL 1.1.
