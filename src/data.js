/* =====================================================================
 *  DATOS EDITABLES — "El viaje de un contenedor"
 *  ---------------------------------------------------------------------
 *  TODO es ficticio: empresas, puertos, buques, importes, números de
 *  documento y códigos. Sirve solo con fines didácticos.
 *
 *  Cómo editar:
 *   · Importes en euros (número, sin formato).
 *   · `pagador`: 5 letras en el orden EXW FOB CIF DAP DDP.
 *       V = vendedor, C = comprador.  Ej.: 'CVVVV' → en EXW paga el
 *       comprador; en FOB, CIF, DAP y DDP paga el vendedor.
 *   · `valorAduana: true`  → el gasto forma parte del valor en aduana
 *       (gastos hasta la entrada en la UE).
 *   · `baseIVA: true`      → gasto accesorio hasta el primer destino que
 *       se suma a la base imponible del IVA de importación.
 *   · `calculo`            → importe calculado (arancel, iva).
 *   · `porCanal`           → importe según el canal de riesgo elegido.
 * ===================================================================== */

export const INCOTERMS_ORDEN = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP'];

export const DATA = {
  meta: {
    titulo: 'El viaje de un contenedor',
    subtitulo: 'Logística y aduanas, paso a paso',
    aviso: 'Contenido didáctico. Empresas, importes, documentos y códigos son ficticios.',
    moneda: 'EUR',
    locale: 'es-ES',
  },

  operacion: {
    vendedor: { nombre: 'Brightwave Lighting Co., Ltd.', ciudad: 'Haizhou', pais: 'Donghai (ficticio)' },
    comprador: { nombre: 'Iluminaciones Meseta, S.L.', ciudad: 'Villaserena', pais: 'España', eori: 'ESB99000001' },
    representante: 'Aduanas Arlanza, S.L. (representante aduanero)',
    mercancia: { descripcion: 'Lámpara LED de escritorio, modelo NOVA-12', unidades: 2400, precioUnitario: 18.75, bultos: 20, pesoBruto: 14820 },
    contenedor: { tipo: "40' High Cube", matricula: 'OCNU 482913 6', precinto: 'BW-778104', tara: 3900 },
    origen: 'Puerto de Haizhou',
    destino: 'Puerto de Valmar (UE)',
    entrega: 'Almacén Meseta, Pol. Los Álamos, Villaserena',
    naviera: 'Oceanis Line',
    buque: 'MV Oceanis Aurora',
    contrato: 'CV-2026-0187',
    proforma: 'PI-BW-26-0412',
    bl: 'OCNHZV0049217',
    mrnExport: '26DH0401EX000731',
    mrnImport: '26ES00481100012347',
    partida: {
      codigo: '9405 XX XX XX',
      descripcion: 'Aparatos de alumbrado LED de escritorio',
      nota: 'Ejemplo didáctico: código y tipo ficticios, no usar para clasificar.',
      arancel: 0.04,
    },
    iva: 0.21,
    pago: 'Crédito documentario irrevocable a la vista',
  },

  incoterms: {
    EXW: {
      nombre: 'En fábrica (Ex Works)',
      resumen: 'El vendedor pone la mercancía a disposición en su almacén, sin cargarla ni despachar la exportación.',
      riesgo: 'Se transmite en el almacén del vendedor.',
      nota: 'Exige al comprador gestionar también la exportación en origen; en la práctica suele dar problemas.',
    },
    FOB: {
      nombre: 'Franco a bordo',
      resumen: 'El vendedor entrega la mercancía a bordo del buque designado por el comprador, con la exportación despachada.',
      riesgo: 'Se transmite cuando la mercancía está a bordo en el puerto de origen.',
      nota: 'Solo transporte marítimo. Para contenedores, la ICC recomienda FCA.',
    },
    CIF: {
      nombre: 'Coste, seguro y flete',
      resumen: 'El vendedor contrata y paga el flete y un seguro mínimo hasta el puerto de destino.',
      riesgo: 'Se transmite a bordo en origen, aunque el vendedor pague el viaje.',
      nota: 'El seguro exigido es mínimo (cláusulas ICC C); conviene ampliarlo.',
    },
    DAP: {
      nombre: 'Entregada en lugar',
      resumen: 'El vendedor lleva la mercancía hasta el lugar convenido, lista para descargar. El comprador despacha la importación.',
      riesgo: 'Se transmite en destino, sobre el camión, antes de descargar.',
      nota: 'Aranceles, IVA y despacho de importación siguen siendo del comprador.',
    },
    DDP: {
      nombre: 'Entregada con derechos pagados',
      resumen: 'El vendedor asume todo, incluido el despacho de importación, el arancel y el IVA.',
      riesgo: 'Se transmite en destino, antes de descargar.',
      nota: 'El vendedor actúa como importador; recuperar el IVA le resulta difícil si no está establecido.',
    },
  },
  incotermInicial: 'CIF',

  /* Canal de riesgo inicial en la terminal de destino */
  canalInicial: 'verde',
  canales: {
    verde: { nombre: 'Verde', texto: 'Levante automático. Sin revisión documental ni física.' },
    naranja: { nombre: 'Naranja', texto: 'Revisión documental: la aduana pide factura, B/L y certificado de origen.' },
    rojo: { nombre: 'Rojo', texto: 'Reconocimiento físico: el contenedor se posiciona, se abre y se inspecciona (o pasa por escáner).' },
  },

  /* Fases del viaje (una por escena) */
  fases: [
    { id: 'oficina', n: 1, nombre: 'Acuerdo comercial', lugar: 'Oficinas de Iluminaciones Meseta', hora: 'Tarde · 17:40' },
    { id: 'fabrica', n: 2, nombre: 'Almacén de origen', lugar: 'Brightwave Lighting, Haizhou', hora: 'Mañana · 08:15' },
    { id: 'terminal-origen', n: 3, nombre: 'Terminal de origen', lugar: 'Puerto de Haizhou', hora: 'Mediodía · 12:30' },
    { id: 'buque', n: 4, nombre: 'Alta mar', lugar: 'MV Oceanis Aurora, día 18 de travesía', hora: 'Atardecer · 19:50' },
    { id: 'terminal-destino', n: 5, nombre: 'Terminal de destino', lugar: 'Puerto de Valmar', hora: 'Amanecer · 06:40' },
    { id: 'aduana', n: 6, nombre: 'Aduana', lugar: 'Puesto de inspección fronteriza de Valmar', hora: 'Noche · 22:10' },
    { id: 'entrega', n: 7, nombre: 'Entrega', lugar: 'Villaserena', hora: 'Tarde · 16:20' },
  ],

  /* Partidas de coste. `fase` = número de escena en la que se devenga. */
  costes: {
    mercancia:        { fase: 1, label: 'Valor de la mercancía (precio EXW base)', importe: 45000, pagador: 'CCCCC', tipo: 'mercancia', valorAduana: true },
    lc_apertura:      { fase: 1, label: 'Comisión de apertura del crédito documentario', importe: 160, pagador: 'CCCCC' },
    lc_negociacion:   { fase: 1, label: 'Comisión de notificación y negociación', importe: 95, pagador: 'VVVVV' },

    embalaje:         { fase: 2, label: 'Embalaje, paletizado y marcado', importe: 620, pagador: 'VVVVV', valorAduana: true },
    carga:            { fase: 2, label: 'Carga y estiba en el contenedor', importe: 280, pagador: 'CVVVV', valorAduana: true },
    precinto:         { fase: 2, label: 'Precinto de alta seguridad (ISO 17712)', importe: 25, pagador: 'CVVVV', valorAduana: true },
    precarriage:      { fase: 2, label: 'Transporte de la fábrica al puerto', importe: 540, pagador: 'CVVVV', valorAduana: true },

    thc_origen:       { fase: 3, label: 'THC de origen (manipulación en terminal)', importe: 210, pagador: 'CVVVV', valorAduana: true },
    vgm:              { fase: 3, label: 'Pesaje y declaración VGM (SOLAS)', importe: 45, pagador: 'CVVVV', valorAduana: true },
    docs_origen:      { fase: 3, label: 'Documentación y certificado de origen', importe: 120, pagador: 'CVVVV', valorAduana: true },
    dua_export:       { fase: 3, label: 'Despacho de exportación (DUA de exportación)', importe: 150, pagador: 'CVVVV', valorAduana: true },

    flete:            { fase: 4, label: "Flete marítimo (40' HC)", importe: 2150, pagador: 'CCVVV', valorAduana: true },
    baf:              { fase: 4, label: 'Recargo por combustible (BAF)', importe: 310, pagador: 'CCVVV', valorAduana: true },
    caf:              { fase: 4, label: 'Recargo por divisa (CAF)', importe: 95, pagador: 'CCVVV', valorAduana: true },
    seguro:           { fase: 4, label: 'Seguro de la mercancía (110 % del valor CIF)', importe: 96, pagador: 'CCVVV', valorAduana: true },
    bl:               { fase: 4, label: 'Emisión del conocimiento de embarque (B/L)', importe: 65, pagador: 'CCVVV', valorAduana: true },

    ens:              { fase: 5, label: 'Declaración sumaria de entrada (ENS · ICS2)', importe: 35, pagador: 'CCVVV', baseIVA: true },
    thc_destino:      { fase: 5, label: 'THC de destino', importe: 245, pagador: 'CCCVV', baseIVA: true },
    almacenaje:       { fase: 5, label: 'Almacenaje en depósito temporal (4 días)', importe: 180, pagador: 'CCCCV', baseIVA: true },
    demoras:          { fase: 5, label: 'Demoras del contenedor (demurrage, 2 días)', importe: 150, pagador: 'CCCCV', baseIVA: true },
    inspeccion:       { fase: 5, label: 'Posicionamiento e inspección según canal', porCanal: { verde: 0, naranja: 45, rojo: 390 }, pagador: 'CCCCV', baseIVA: true },

    dua_import:       { fase: 6, label: 'Despacho de importación (honorarios)', importe: 165, pagador: 'CCCCV' },
    arancel:          { fase: 6, label: 'Arancel (derechos de importación)', calculo: 'arancel', pagador: 'CCCCV' },
    iva:              { fase: 6, label: 'IVA de importación', calculo: 'iva', pagador: 'CCCCV', deducible: true },

    transporte_final: { fase: 7, label: 'Transporte al almacén del comprador', importe: 480, pagador: 'CCCVV', baseIVA: true },
    descarga:         { fase: 7, label: 'Descarga en el almacén del comprador', importe: 140, pagador: 'CCCCC', baseIVA: true },
  },

  /* Modelos glTF/GLB opcionales (CC0) que se añaden a una escena.
     Ejemplo: { escena: 'fabrica', url: 'assets/models/carretilla.glb', pos: [-14, 0, 6], rotY: 1.2, escala: 1 }
     Escenas: oficina, fabrica, terminal-origen, buque, terminal-destino, aduana, entrega. */
  modelosExtra: [],

  /* Hotspots por escena. `costes` = partidas que se explican.
     `previa: true` = se muestra el importe, pero se devenga en otra fase. */
  hotspots: {
    oficina: [
      { id: 'incoterm', titulo: 'Incoterm', alt: 'Cláusula Incoterm del contrato', costes: [], tipo: 'incoterm',
        texto: 'El Incoterm fija dónde se entrega la mercancía, quién paga cada tramo y en qué momento pasa el riesgo del vendedor al comprador. No dice nada sobre la propiedad ni sobre el pago.' },
      { id: 'precio', titulo: 'Precio', alt: 'Precio y cantidad en la factura proforma', costes: ['mercancia'],
        texto: '2.400 unidades a 18,75 € = 45.000 €. Es el precio base en fábrica (EXW). Con otros Incoterms el vendedor suele repercutir sus gastos en el precio; aquí se muestran por separado para ver quién paga qué.' },
      { id: 'pago', titulo: 'Forma de pago', alt: 'Cláusula de forma de pago', costes: ['lc_apertura', 'lc_negociacion'],
        texto: 'Crédito documentario irrevocable: el banco del comprador paga al vendedor cuando este presenta los documentos exigidos (factura, B/L, certificado de origen y póliza). Cada banco cobra su comisión.' },
      { id: 'seguro', titulo: 'Seguro', alt: 'Cláusula de seguro', costes: ['seguro'], previa: true,
        texto: 'El contrato fija quién asegura y con qué cobertura. En CIF el vendedor solo está obligado a un seguro mínimo (ICC C) por el 110 % del valor. Se paga al embarcar.' },
      { id: 'transporte', titulo: 'Transporte', alt: 'Cláusula de transporte y puertos', costes: ['precarriage', 'flete', 'transporte_final'], previa: true,
        texto: 'Ruta acordada: almacén del vendedor → Puerto de Haizhou → Puerto de Valmar → almacén del comprador. El Incoterm decide quién contrata y paga cada tramo.' },
    ],
    fabrica: [
      { id: 'embalaje', titulo: 'Embalaje', alt: 'Palés embalados y marcados', costes: ['embalaje'],
        texto: 'Embalar es siempre obligación del vendedor: palés fumigados (NIMF 15), film, cantoneras y marcado de bultos. Un embalaje deficiente es la primera causa de daños en tránsito.' },
      { id: 'carga', titulo: 'Carga', alt: 'Carretilla cargando el contenedor', costes: ['carga'],
        texto: 'Estiba y trincaje dentro del contenedor. En EXW la carga ya corre por cuenta y riesgo del comprador; en el resto de Incoterms la hace el vendedor.' },
      { id: 'precinto', titulo: 'Precinto', alt: 'Precinto de seguridad en la puerta del contenedor', costes: ['precinto'],
        texto: 'Precinto de alta seguridad BW-778104. Su número viaja en el B/L y en las declaraciones: si llega roto o no coincide, la aduana y el seguro lo tratarán como incidencia.' },
      { id: 'transporte-puerto', titulo: 'Transporte a puerto', alt: 'Camión con el contenedor saliendo hacia el puerto', costes: ['precarriage'],
        texto: 'Tramo terrestre hasta la terminal de origen (pre-carriage). Se paga con el contenedor lleno y debe llegar antes del cierre de admisión (cut-off) del buque.' },
    ],
    'terminal-origen': [
      { id: 'thc-origen', titulo: 'THC origen', alt: 'Grúa pórtico manipulando contenedores', costes: ['thc_origen'],
        texto: 'Terminal Handling Charges: recepción, apilado y carga a bordo con la grúa pórtico. En FOB los paga el vendedor, porque entrega con la mercancía a bordo.' },
      { id: 'vgm', titulo: 'Pesaje VGM', alt: 'Báscula de pesaje del contenedor', costes: ['vgm'],
        texto: 'Masa bruta verificada (convenio SOLAS): sin VGM declarada el contenedor no embarca. 14.820 kg de carga + 3.900 kg de tara = 18.720 kg.' },
      { id: 'documentacion', titulo: 'Documentación', alt: 'Oficina de documentación de la terminal', costes: ['docs_origen'],
        texto: 'Instrucciones de embarque, certificado de origen y lista de bultos. Con ellos la naviera emite el B/L y el comprador podrá aplicar, en su caso, preferencias arancelarias.' },
      { id: 'dua-export', titulo: 'DUA de exportación', alt: 'Declaración de exportación', costes: ['dua_export'],
        texto: 'Declaración de exportación (MRN 26DH0401EX000731). La presenta el exportador o su representante. En EXW este trámite recae, incómodamente, en el comprador.' },
    ],
    buque: [
      { id: 'flete', titulo: 'Flete marítimo', alt: 'Buque portacontenedores navegando', costes: ['flete'],
        texto: 'Precio del transporte puerto a puerto del contenedor completo (FCL). Lo paga quien contrata el transporte principal: el comprador en EXW y FOB; el vendedor en CIF, DAP y DDP.' },
      { id: 'recargos', titulo: 'Recargos BAF y CAF', alt: 'Chimenea del buque', costes: ['baf', 'caf'],
        texto: 'BAF ajusta el flete al precio del combustible; CAF, a las variaciones de divisa. Cambian cada mes y conviene preguntar si la cotización los incluye.' },
      { id: 'seguro-mar', titulo: 'Seguro', alt: 'Contenedores estibados en cubierta', costes: ['seguro'],
        texto: 'Prima de 0,15 % sobre el 110 % del valor CIF (mínimo 90 €). En CIF el riesgo ya es del comprador, aunque el seguro lo contrate el vendedor: la póliza debe poder endosarse.' },
      { id: 'bl', titulo: 'B/L', alt: 'Puente de mando del buque', costes: ['bl'],
        texto: 'El conocimiento de embarque (B/L OCNHZV0049217) es recibo de la mercancía, prueba del contrato de transporte y título de propiedad: quien lo tiene, retira el contenedor.' },
    ],
    'terminal-destino': [
      { id: 'thc-destino', titulo: 'THC destino', alt: 'Grúa descargando el contenedor', costes: ['thc_destino'],
        texto: 'Descarga del buque y manipulación en la terminal de destino. En DAP y DDP forman parte del transporte que paga el vendedor.' },
      { id: 'ens', titulo: 'ENS · ICS2', alt: 'Centro de control de la terminal', costes: ['ens'],
        texto: 'La declaración sumaria de entrada se presenta en ICS2 antes de cargar en origen (24 h antes, en marítimo de contenedores). La presenta el transportista; su coste se repercute a quien contrata el flete.' },
      { id: 'riesgo', titulo: 'Análisis de riesgo', alt: 'Semáforo de análisis de riesgo', costes: ['inspeccion'], tipo: 'canal',
        texto: 'Con la ENS y el DUA, la aduana asigna un canal. Elige uno para ver cómo cambia el coste:' },
      { id: 'almacenaje', titulo: 'Depósito temporal', alt: 'Contenedores apilados en el depósito temporal', costes: ['almacenaje'],
        texto: 'Hasta su levante, el contenedor queda en depósito temporal bajo control aduanero. Los primeros días suelen ser libres; después, la terminal cobra almacenaje diario.' },
      { id: 'demoras', titulo: 'Demoras', alt: 'Reloj de demoras del contenedor', costes: ['demoras'],
        texto: 'La naviera da días libres para usar su contenedor. Si se superan, cobra demurrage (en terminal) y detention (fuera). Un DUA mal preparado sale caro aquí.' },
    ],
    aduana: [
      { id: 'dua-import', titulo: 'DUA de importación', alt: 'Monitor con la declaración de importación', costes: ['dua_import'],
        texto: 'Declaración aduanera de importación (MRN 26ES00481100012347), presentada por el representante aduanero en nombre del importador.' },
      { id: 'partida', titulo: 'Partida arancelaria', alt: 'Caja con la etiqueta de la mercancía', costes: [], tipo: 'partida',
        texto: 'La clasificación en el TARIC fija el tipo del arancel, las medidas y los requisitos (marcado CE, etiquetado energético…). Una mala clasificación es la causa más común de liquidaciones complementarias.' },
      { id: 'arancel', titulo: 'Arancel', alt: 'Cálculo del arancel', costes: ['arancel'], tipo: 'arancel',
        texto: 'Se aplica sobre el valor en aduana: precio más los gastos de transporte y seguro hasta la entrada en la UE.' },
      { id: 'iva', titulo: 'IVA de importación', alt: 'Cálculo del IVA de importación', costes: ['iva'], tipo: 'iva',
        texto: 'Base: valor en aduana + arancel + gastos accesorios hasta el primer destino. Es deducible para el importador con derecho a deducción; financieramente pesa, pero no es un coste final.' },
      { id: 'levante', titulo: 'Levante', alt: 'Barrera de salida del recinto aduanero', costes: [], tipo: 'levante',
        texto: 'Con la deuda aduanera pagada o garantizada, la aduana concede el levante: el contenedor puede salir del recinto. Pulsa de nuevo para ver la barrera abrirse.' },
    ],
    entrega: [
      { id: 'transporte-final', titulo: 'Transporte final', alt: 'Camión en la carretera hacia el almacén', costes: ['transporte_final'],
        texto: 'Último tramo por carretera hasta Villaserena, incluida la devolución del contenedor vacío al depósito de la naviera.' },
      { id: 'descarga', titulo: 'Descarga', alt: 'Muelle de descarga del almacén del comprador', costes: ['descarga'],
        texto: 'Descargar en destino es del comprador incluso en DAP y DDP: el vendedor entrega con la mercancía sobre el camión, lista para descargar.' },
      { id: 'libre-circulacion', titulo: 'Libre circulación', alt: 'Almacén del comprador con la mercancía', costes: [], tipo: 'libre',
        texto: 'Con el despacho a libre práctica y el IVA liquidado, la mercancía es comunitaria a todos los efectos: puede venderse en cualquier país de la UE sin más formalidades aduaneras.' },
    ],
  },
};
