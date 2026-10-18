import type { MapMetricKey } from "../types/observatory";

export interface MetricGuideItem {
  id: string;
  mapKey?: MapMetricKey;
  title: string;
  shortTitle: string;
  badge: string;
  weightInIsvp?: string;
  unit: string;
  sourceName: string;
  sourceDatasetId: string;
  plainExplanation: string;
  whyItMatters: string;
  formulaSummary: string;
  interpretationGuide: Array<{
    range: string;
    label: string;
    meaning: string;
    colorClass: string;
  }>;
  realWorldExample: string;
}

export const ISVP_LEVELS = [
  {
    level: "Crítica" as const,
    range: "62,0 – 100 ptos",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
    dotClass: "bg-red-600",
    summary:
      "Saturación severa del parque residencial y del espacio público con riesgo agudo de expulsión vecinal y pérdida de comercio cotidiano.",
    citizenMeaning:
      "El barrio concentra una densidad extrema de pisos turísticos y terrazas respecto a su superficie, acompañada de pérdida de comercio de proximidad o alta conflictividad por ruido y deterioro.",
  },
  {
    level: "Alta" as const,
    range: "46,0 – 61,9 ptos",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    dotClass: "bg-amber-600",
    summary:
      "Fuerte tensión habitacional o comercial activa. Son barrios frontera o ejes consolidados donde la turistificación avanza con rapidez.",
    citizenMeaning:
      "Se observa un crecimiento acelerado de nuevas licencias VUT (especialmente entre 2024 y 2026) o una sustitución visible del tejido comercial tradicional por actividades orientadas al visitante.",
  },
  {
    level: "Moderada" as const,
    range: "32,0 – 45,9 ptos",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
    dotClass: "bg-sky-600",
    summary:
      "Presión intermedia o localizada en ejes concretos, o barrios residenciales con vulnerabilidad socioeconómica que requieren vigilancia preventiva.",
    citizenMeaning:
      "El barrio mantiene aún predominio residencial, pero presenta focos puntuales de viviendas turísticas, quejas de mantenimiento urbano o vulnerabilidad demográfica/económica.",
  },
  {
    level: "Baja" as const,
    range: "0,0 – 31,9 ptos",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dotClass: "bg-emerald-600",
    summary:
      "Baja exposición actual a la presión de pisos turísticos y estabilidad relativa de sus indicadores de convivencia y actividad comercial.",
    citizenMeaning:
      "Predomina el uso residencial habitual con baja densidad de licencias VUT por km² y niveles contenidos de saturación del espacio público.",
  },
];

export const CORE_VECTORS_GUIDE: MetricGuideItem[] = [
  {
    id: "isvp",
    mapKey: "isvp",
    title: "Índice Sintético de Vulnerabilidad y Presión (ISVP)",
    shortTitle: "ISVP Global",
    badge: "Índice Compuesto Principal (0–100)",
    weightInIsvp: "100% (Suma ponderada de 4 vectores)",
    unit: "puntos (0–100)",
    sourceName: "Cruce GVA Dades Obertes + CKAN Ayuntamiento de València",
    sourceDatasetId: "tur-gestur-vt + FEMP 11, 12, 20, 40",
    plainExplanation:
      "Es el termómetro general del observatorio. Resume en una sola cifra de 0 a 100 cuánta presión acumula un barrio al combinar pisos turísticos, pérdida de comercio de barrio, quejas vecinales de convivencia y fragilidad social de sus habitantes.",
    whyItMatters:
      "Analizar solo el número de pisos turísticos engaña: 200 pisos turísticos en un barrio pequeño, denso o con población envejecida y renta baja generan un impacto mucho más disruptivo que en una zona de baja densidad y renta alta. El ISVP permite comparar los 88 barrios de València con una regla común.",
    formulaSummary:
      "ISVP = 0,35 × Presión Turística + 0,25 × Desplazamiento Comercial + 0,20 × Brecha de Equidad Urbana + 0,20 × Vulnerabilidad Residencial",
    interpretationGuide: [
      {
        range: "62 – 100",
        label: "Alerta Crítica",
        meaning: "Saturación acumulada muy elevada en múltiples dimensiones.",
        colorClass: "bg-red-100 text-red-900 border-red-300",
      },
      {
        range: "46 – 61,9",
        label: "Alerta Alta",
        meaning: "Presión notable por encima del promedio urbano de València.",
        colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      },
      {
        range: "32 – 45,9",
        label: "Alerta Moderada",
        meaning: "Exposición media o tensión incipiente por efecto frontera.",
        colorClass: "bg-sky-100 text-sky-900 border-sky-300",
      },
      {
        range: "0 – 31,9",
        label: "Alerta Baja",
        meaning: "Baja presión turística y equilibrio residencial relativo.",
        colorClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
      },
    ],
    realWorldExample:
      "Barrios de Ciutat Vella (como El Mercat o La Seu), L'Eixample (Russafa) y Poblats Marítims (El Cabanyal-El Canyamelar) encabezan el ISVP porque combinan altísima densidad de VUT por km² con fuerte ocupación de terrazas y quejas de convivencia.",
  },
  {
    id: "presion_turistica",
    mapKey: "presion_turistica",
    title: "Vector 1 · Presión Residencial de Viviendas Turísticas",
    shortTitle: "Presión Turística",
    badge: "Peso en ISVP: 35%",
    weightInIsvp: "35%",
    unit: "puntos (0–100)",
    sourceName: "Generalitat Valenciana — Registro de Viviendas de Uso Turístico",
    sourceDatasetId: "tur-gestur-vt",
    plainExplanation:
      "Mide la intensidad con la que las Viviendas de Uso Turístico (VUT) compiten por el espacio residencial del barrio, teniendo en cuenta no solo cuántas licencias hay, sino cuántas caben por kilómetro cuadrado y a qué velocidad se han abierto en los últimos dos años.",
    whyItMatters:
      "Cada vivienda que pasa al mercado turístico de corta estancia reduce la oferta de alquiler residencial permanente y presiona al alza los precios de renovación para los vecinos del barrio.",
    formulaSummary:
      "Combina densidad espacial (VUT/km², hasta 50 ptos), volumen de plazas alojativas (hasta 30 ptos) y aceleración de nuevas altas 2024–2026 (hasta 20 ptos).",
    interpretationGuide: [
      {
        range: "70 – 100",
        label: "Saturación Extrema",
        meaning: "Más de 100–150 VUT/km² y alta rotación de plazas turísticas.",
        colorClass: "bg-red-100 text-red-900 border-red-300",
      },
      {
        range: "40 – 69,9",
        label: "Expansión Activa",
        meaning: "Densidad superior a la media de la ciudad (42,3 VUT/km²).",
        colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      },
      {
        range: "0 – 39,9",
        label: "Baja Intensidad",
        meaning: "Presencia moderada o testimonial de pisos turísticos.",
        colorClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
      },
    ],
    realWorldExample:
      "En València hay 5.708 VUT vigentes (19.886 plazas), de las cuales 2.893 se dieron de alta desde enero de 2024: más de la mitad del parque activo actual se inscribió en apenas dos años.",
  },
  {
    id: "desplazamiento_comercial",
    mapKey: "desplazamiento_comercial",
    title: "Vector 2 · Riesgo de Desplazamiento Comercial y Terrazas",
    shortTitle: "Comercio y Terrazas",
    badge: "Peso en ISVP: 25%",
    weightInIsvp: "25%",
    unit: "puntos (0–100)",
    sourceName: "Ayuntamiento de València — Censo IAE y Ocupación de Vía Pública",
    sourceDatasetId: "FEMP Nº 20 (recibos-iae / recibos-terrazas)",
    plainExplanation:
      "Evalúa si el comercio tradicional de barrio está siendo sustituido o presionado por la monocultura hostelera y turística, cruzando la evolución del Impuesto de Actividades Económicas (IAE) con la densidad de terrazas (mesas y sillas) en las aceras y plazas.",
    whyItMatters:
      "Un barrio habitable necesita panaderías, ferreterías, mercados y servicios cotidianos. Cuando el suelo comercial se orienta exclusivamente al consumo visitante y las terrazas saturan el espacio peatonal, se erosiona la autonomía cotidiana del vecindario.",
    formulaSummary:
      "Integra la densidad de licencias de terrazas por km², el volumen absoluto de mesas/sillas y la caída interanual de recibos IAE de actividades tradicionales.",
    interpretationGuide: [
      {
        range: "65 – 100",
        label: "Monocultivo / Saturación",
        meaning: "Alta concentración de terrazas y retroceso o rotación del IAE.",
        colorClass: "bg-red-100 text-red-900 border-red-300",
      },
      {
        range: "35 – 64,9",
        label: "Tensión Comercial",
        meaning: "Convivencia tensa entre comercio vecinal y ejes de ocio.",
        colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      },
      {
        range: "0 – 34,9",
        label: "Tejido Estable",
        meaning: "Baja saturación de vía pública por hostelería.",
        colorClass: "bg-sky-100 text-sky-900 border-sky-300",
      },
    ],
    realWorldExample:
      "En barrios como Russafa, El Mercat o Sant Francesc, la concentración de recibos de terrazas por km² multiplica varias veces el promedio de los distritos periféricos.",
  },
  {
    id: "brecha_equidad_urbana",
    mapKey: "brecha_equidad_urbana",
    title: "Vector 3 · Brecha de Equidad Urbana y Convivencia Vecinal",
    shortTitle: "Equidad y Avisos",
    badge: "Peso en ISVP: 20%",
    weightInIsvp: "20%",
    unit: "puntos (0–100)",
    sourceName: "Ayuntamiento de València — Quejas, Sugerencias y Equipamientos",
    sourceDatasetId: "FEMP Nº 11 (femp11-quejas-sugerencias)",
    plainExplanation:
      "Mide la fricción cotidiana en el espacio público a partir de las 176.051 comunicaciones y quejas vecinales registradas ante el Ayuntamiento, distinguiendo las incidencias de ruido, botellón y convivencia de las de limpieza, basuras y desperfectos en aceras y calzadas.",
    whyItMatters:
      "La sobrecarga turística y de ocio genera costes ocultos sobre la limpieza viaria, la recogida de residuos y el descanso nocturno. Si esa sobrecarga no se compensa con mayor mantenimiento y equipamientos de barrio, se abre una brecha de equidad urbana.",
    formulaSummary:
      "Cruza la densidad de avisos ciudadanos por km², el peso de las quejas por ruido/convivencia y el índice de déficit de equipamientos públicos del barrio.",
    interpretationGuide: [
      {
        range: "60 – 100",
        label: "Sobrecarga Vecinal Alta",
        meaning: "Elevado volumen de quejas por ruido, limpieza o déficit dotacional.",
        colorClass: "bg-red-100 text-red-900 border-red-300",
      },
      {
        range: "35 – 59,9",
        label: "Fricción Moderada",
        meaning: "Incidencia media de avisos urbanos respecto a su superficie.",
        colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      },
      {
        range: "0 – 34,9",
        label: "Baja Fricción Reportada",
        meaning: "Menor densidad de incidencias y dotación equilibrada.",
        colorClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
      },
    ],
    realWorldExample:
      "El motor DuckDB clasifica mediante expresiones regulares las 176.051 comunicaciones del dataset FEMP Nº 11 para aislar problemas de convivencia nocturna y deterioro del pavimento.",
  },
  {
    id: "vulnerabilidad_residencial",
    mapKey: "vulnerabilidad_residencial",
    title: "Vector 4 · Vulnerabilidad Socioeconómica y Demográfica Amplificada",
    shortTitle: "Vulnerabilidad Social",
    badge: "Peso en ISVP: 20%",
    weightInIsvp: "20%",
    unit: "puntos (0–100)",
    sourceName: "Oficina de Estadística de València — Vulnerabilidad por Barrios",
    sourceDatasetId: "vulnerabilidad-por-barrios",
    plainExplanation:
      "Mide la fragilidad social de quienes habitan el barrio (renta familiar, desempleo, envejecimiento, hogares unipersonales mayores y nivel de estudios) y cómo esa fragilidad se ve agravada cuando el barrio sufre además presión de pisos turísticos.",
    whyItMatters:
      "Un mismo aumento del precio de la vivienda tiene consecuencias muy distintas según la capacidad económica del vecindario. En barrios vulnerables, la entrada de capital turístico o inversión especulativa provoca desplazamientos forzosos mucho más rápidos.",
    formulaSummary:
      "Normaliza el índice oficial de vulnerabilidad municipal (escala 1,0 a 5,0 invertida a 0–100) y añade un factor de amplificación (+25% de la presión turística local).",
    interpretationGuide: [
      {
        range: "60 – 100",
        label: "Alta Fragilidad Social",
        meaning: "Población con menor colchón económico frente a subidas de vivienda.",
        colorClass: "bg-red-100 text-red-900 border-red-300",
      },
      {
        range: "35 – 59,9",
        label: "Vulnerabilidad Media",
        meaning: "Situación socioeconómica intermedia o mixta.",
        colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      },
      {
        range: "0 – 34,9",
        label: "Mayor Resiliencia Renta",
        meaning: "Barrios con indicadores socioeconómicos más favorables.",
        colorClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
      },
    ],
    realWorldExample:
      "En barrios marítimos o históricos como El Cabanyal-El Canyamelar, Orriols o Marxalenes, la combinación de vulnerabilidad socioeconómica previa con nueva presión inmobiliaria dispara el riesgo de exclusión residencial.",
  },
];

export interface EmpiricalMetricDefinition {
  id: string;
  field: string;
  name: string;
  category: "Vivienda Turística" | "Comercio y Vía Pública" | "Convivencia y Equidad" | "Presupuesto y Trazabilidad";
  unit: string;
  source: string;
  whatIsIt: string;
  howToReadIt: string;
}

export const EMPIRICAL_METRICS_GLOSSARY: EmpiricalMetricDefinition[] = [
  {
    id: "vut-activas",
    field: "vut_activas",
    name: "VUT Vigentes (Viviendas de Uso Turístico)",
    category: "Vivienda Turística",
    unit: "viviendas",
    source: "GVA Dades Obertes (tur-gestur-vt)",
    whatIsIt:
      "Número total de viviendas inscritas y en estado activo en el Registro de Turismo de la Comunitat Valenciana dentro del término municipal de València.",
    howToReadIt:
      "Indica el volumen absoluto de pisos dedicados a alquiler turístico oficial en el barrio. En toda València suma 5.708 viviendas.",
  },
  {
    id: "plazas-vut",
    field: "plazas_vut",
    name: "Plazas Turísticas Ofertadas",
    category: "Vivienda Turística",
    unit: "plazas",
    source: "GVA Dades Obertes (tur-gestur-vt, campo PLAZAS)",
    whatIsIt:
      "Capacidad máxima de huéspedes simultáneos autorizados en las viviendas turísticas activas del barrio.",
    howToReadIt:
      "Mide la población flotante potencial que añade presión diaria sobre los servicios públicos, el transporte y el comercio del barrio (media de ~3,5 plazas por VUT).",
  },
  {
    id: "densidad-vut",
    field: "densidad_vut_km2",
    name: "Densidad Espacial de VUT (VUT / km²)",
    category: "Vivienda Turística",
    unit: "VUT / km²",
    source: "Cálculo espacial Turf.js + DuckDB sobre barris-barrios",
    whatIsIt:
      "Cociente entre el número de viviendas turísticas activas del barrio y su superficie oficial en kilómetros cuadrados.",
    howToReadIt:
      "Permite comparar justamente barrios grandes (como Benimàmet o La Punta) con barrios muy compactos (como El Mercat o El Carme). La media de los 88 barrios es de 42,3 VUT/km².",
  },
  {
    id: "altas-recientes",
    field: "vut_altas_recientes",
    name: "Nuevas Altas Recientes (2024–2026)",
    category: "Vivienda Turística",
    unit: "viviendas",
    source: "GVA tur-gestur-vt (campo FECHA_ALTA ≥ 2024-01-01)",
    whatIsIt:
      "Licencias turísticas que se han inscrito por primera vez entre 2024 y la actualidad.",
    howToReadIt:
      "Revela hacia qué barrios se está desplazando la ola más reciente de inversión turística (efecto frontera hacia Zaidía, Algirós, Camins al Grau o Poblats Marítims).",
  },
  {
    id: "recibos-terrazas",
    field: "recibos_terrazas",
    name: "Licencias / Recibos de Terrazas Hosteleras",
    category: "Comercio y Vía Pública",
    unit: "recibos",
    source: "Ayuntamiento de València — FEMP Nº 20 (recibos-terrazas)",
    whatIsIt:
      "Recibos fiscales liquidados por ocupación de dominio público municipal con mesas, sillas y veladores de hostelería.",
    howToReadIt:
      "Cuanto mayor es este número en relación con el tamaño del barrio, mayor es la privatización del espacio peatonal y la orientación del bajo comercial hacia la restauración.",
  },
  {
    id: "recibos-iae",
    field: "recibos_iae / variacion_iae_pct",
    name: "Censo IAE y Variación de Actividad (%)",
    category: "Comercio y Vía Pública",
    unit: "recibos (% var.)",
    source: "Ayuntamiento de València — FEMP Nº 20 (recibos-iae)",
    whatIsIt:
      "Recibos del Impuesto de Actividades Económicas y su tasa de variación interanual en el barrio.",
    howToReadIt:
      "Una variación negativa (en rojo) combinada con alta presencia de terrazas alerta de contracción o sustitución del tejido empresarial productivo y comercial clásico.",
  },
  {
    id: "avisos-ruido",
    field: "avisos_ruido_convivencia",
    name: "Avisos por Ruido, Ocio y Convivencia",
    category: "Convivencia y Equidad",
    unit: "comunicaciones",
    source: "Ayuntamiento de València — FEMP Nº 11 (femp11-quejas-sugerencias)",
    whatIsIt:
      "Quejas y reclamaciones ciudadanas vinculadas a contaminación acústica, molestias nocturnas, terrazas, botellón y convivencia vecinal.",
    howToReadIt:
      "Refleja el malestar vecinal directo por saturación de usos recreativos y turísticos en el entorno inmediato de las viviendas.",
  },
  {
    id: "avisos-deterioro",
    field: "avisos_deterioro_viario",
    name: "Avisos por Deterioro Viario y Limpieza",
    category: "Convivencia y Equidad",
    unit: "comunicaciones",
    source: "Ayuntamiento de València — FEMP Nº 11 (femp11-quejas-sugerencias)",
    whatIsIt:
      "Quejas vecinales sobre suciedad, recogida de residuos, contenedores desbordados, baches, aceras rotas y mobiliario urbano degradado.",
    howToReadIt:
      "Permite detectar si el desgaste intensivo del espacio público está siendo atendido o si existe desatención crónica del mantenimiento barrial.",
  },
  {
    id: "vulnerabilidad-municipal",
    field: "ind_vulnerabilidad_municipal",
    name: "Índice Municipal Base de Vulnerabilidad (1–5)",
    category: "Convivencia y Equidad",
    unit: "escala 1,0 a 5,0",
    source: "Ayuntamiento de València (vulnerabilidad-por-barrios)",
    whatIsIt:
      "Indicador estadístico oficial del Ayuntamiento que sintetiza vulnerabilidad económica, demográfica (envejecimiento/dependencia) y de equipamientos.",
    howToReadIt:
      "En la escala original municipal, valores más cercanos a 1,0 indican mayor vulnerabilidad relativa, mientras que en nuestro Vector 4 se normalizan de 0 a 100 para que valores más altos representen siempre mayor riesgo.",
  },
  {
    id: "gasto-subvenciones",
    field: "gastoBienesServiciosEur / subvencionesNominativasEur",
    name: "Ejecución Presupuestaria y Subvenciones (FEMP 12 y 40)",
    category: "Presupuesto y Trazabilidad",
    unit: "euros (€)",
    source: "Ayuntamiento de València — FEMP Nº 12 y Nº 40",
    whatIsIt:
      "Importe total auditado del capítulo de gasto corriente en bienes y servicios municipales (317,2 M€) y subvenciones nominativas (18,6 M€).",
    howToReadIt:
      "Actualmente el Ayuntamiento publica estos dos datasets sin código de barrio (`coddistbar`). El observatorio audita su volumen global y proporciona la herramienta legal (Ley 1/2022) para exigir su desagregación territorial.",
  },
];

export function buildBarrioNarrative(
  b: {
    nombre: string;
    distrito: string;
    isvp: number;
    nivel_alerta: string;
    vut_activas: number;
    plazas_vut: number;
    vut_altas_recientes: number;
    densidad_vut_km2: number;
    presion_turistica: number;
    desplazamiento_comercial: number;
    brecha_equidad_urbana: number;
    vulnerabilidad_residencial: number;
    recibos_terrazas: number;
    avisos_totales: number;
    etiqueta_vulnerabilidad_municipal: string;
  },
  avgIsvp = 33.8,
  avgDensidad = 42.3
): string {
  const diffIsvp = b.isvp - avgIsvp;
  const posicionCiudad =
    diffIsvp >= 15
      ? `muy por encima de la media municipal (${avgIsvp.toFixed(1)} ptos)`
      : diffIsvp >= 3
      ? `por encima del promedio de València (${avgIsvp.toFixed(1)} ptos)`
      : diffIsvp <= -8
      ? `claramente por debajo de la media de la ciudad (${avgIsvp.toFixed(1)} ptos)`
      : `en un rango próximo a la media de València (${avgIsvp.toFixed(1)} ptos)`;

  const vectors = [
    { name: "la presión de viviendas turísticas", val: b.presion_turistica },
    { name: "la saturación comercial y de terrazas", val: b.desplazamiento_comercial },
    { name: "la fricción en convivencia y avisos urbanos", val: b.brecha_equidad_urbana },
    { name: "la vulnerabilidad socioeconómica y demográfica", val: b.vulnerabilidad_residencial },
  ].sort((x, y) => y.val - x.val);

  const primaryDriver = vectors[0]!;
  const secondaryDriver = vectors[1]!;

  const ratioDensidad =
    avgDensidad > 0 ? (b.densidad_vut_km2 / avgDensidad).toFixed(1) : "1,0";

  return `${b.nombre} (${b.distrito}) registra un nivel de Alerta ${b.nivel_alerta} con un ISVP de ${b.isvp.toFixed(
    1
  )} sobre 100, situándose ${posicionCiudad}. Su factor de mayor tensión es ${
    primaryDriver.name
  } (${primaryDriver.val.toFixed(1)}/100), seguido de ${
    secondaryDriver.name
  } (${secondaryDriver.val.toFixed(1)}/100). Cuenta con ${
    b.vut_activas
  } viviendas turísticas activas (${b.plazas_vut} plazas y ${
    b.vut_altas_recientes
  } altas recientes desde 2024), lo que equivale a una densidad de ${b.densidad_vut_km2.toFixed(
    1
  )} VUT/km² (${ratioDensidad}x la media barrial de la ciudad).`;
}
