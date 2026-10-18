export interface BarrioIndicators {
  coddistbar: string;
  coddistrit: string;
  codbarrio: string;
  nombre: string;
  distrito: string;
  area_km2: number;
  centroid: [number, number];
  vut_activas: number;
  plazas_vut: number;
  vut_altas_recientes: number;
  densidad_vut_km2: number;
  recibos_iae: number;
  variacion_iae_pct: number;
  recibos_terrazas: number;
  importe_terrazas_eur: number;
  avisos_totales: number;
  avisos_ruido_convivencia: number;
  avisos_deterioro_viario: number;
  ind_vulnerabilidad_municipal: number;
  etiqueta_vulnerabilidad_municipal: string;
  presion_turistica: number;
  desplazamiento_comercial: number;
  brecha_equidad_urbana: number;
  vulnerabilidad_residencial: number;
  isvp: number;
  nivel_alerta: "Crítica" | "Alta" | "Moderada" | "Baja";
}

export interface SnapshotInfo {
  category: string;
  datasetId: string;
  fileName: string;
  relativePath: string;
  sourceUrl: string;
  capturedAt: string;
  sha256: string;
  bytes: number;
  etag?: string | null;
  lastModified?: string | null;
  license?: string | null;
  publisher?: string | null;
}

export interface ResumenObservatorio {
  project: string;
  title: string;
  updatedAt: string;
  kpis: {
    vutActivasValencia: number;
    plazasTuristicasValencia: number;
    vutActivasComunitat: number;
    altasRecientes2024a2026: number;
    barriosAnalizados: number;
    barriosAlertaCriticaOAlta: number;
    avisosCiudadanosAnalizados: number;
    subvencionesNominativasEur: number;
    presupuestoMunicipalAnalizadoEur: number;
    gastoBienesServiciosEur: number;
    snapshotsAcumulados: number;
  };
  latestSnapshot: SnapshotInfo;
  topBarriosPresion: BarrioIndicators[];
  allBarrios: BarrioIndicators[];
}

export interface SeriesHistoricas {
  generatedAt: string;
  snapshotsDiff: Array<{
    snapshotFile: string;
    capturedAt: string;
    sha256: string;
    vutActivasValencia: number;
    plazasValencia: number;
    altasRespectoAnterior: number;
    bajasRespectoAnterior: number;
    variacionNeta: number;
  }>;
  serieAnualAltas: Array<{
    anio: number;
    nuevas_licencias: number;
    nuevas_plazas: number;
    stock_acumulado_vigente: number;
    plazas_acumuladas_vigentes: number;
  }>;
  distritosResumen: Array<{
    coddistrit: string;
    distrito: string;
    barriosCount: number;
    vut_activas: number;
    plazas_vut: number;
    avisos_totales: number;
    recibos_terrazas: number;
    isvp_promedio: number;
  }>;
  codigosPostalesRanking: Array<{
    cp: string;
    vut_activas: number;
    plazas_vut: number;
    altas_recientes: number;
    superficie_media: number;
  }>;
}

export interface DatasetAuditItem {
  codigo: string;
  titulo: string;
  packageId: string;
  estadoApertura: string;
  desagregacionEspacial: string;
  registrosCapturados: number;
  incidenciaDetectada: string;
  accionGobernanza: string;
}

export interface AuditoriaFemp80 {
  generatedAt: string;
  marcoLegal: string;
  canalesOficiales: {
    solicitud_datos_ayuntamiento: string;
    casos_uso_ayuntamiento: string;
    premios_datos_abiertos: string;
    las_naves_email: string;
    upv_dades_valencia: string;
    oficinaEstadisticaEmail: string;
    sedeEstadistica?: string;
  };
  datasetsAuditados: DatasetAuditItem[];
}

export type MapMetricKey =
  | "isvp"
  | "presion_turistica"
  | "desplazamiento_comercial"
  | "brecha_equidad_urbana"
  | "vulnerabilidad_residencial";
