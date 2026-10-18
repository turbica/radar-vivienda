import { readFile } from "node:fs/promises";
import path from "node:path";
import fuentes from "../../../config/fuentes.json";
import type {
  AuditoriaFemp80,
  BarrioIndicators,
  ResumenObservatorio,
  SeriesHistoricas,
} from "../types/observatory";

async function loadJsonOrFallback<T>(fileName: string, fallback: T): Promise<T> {
  const candidates = [
    path.resolve(process.cwd(), "..", "data", "processed", fileName),
    path.resolve(process.cwd(), "data", "processed", fileName),
    path.resolve(process.cwd(), "public", "data", "processed", fileName),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      // Intenta la siguiente ruta candidata
    }
  }
  return fallback;
}

export const fallbackResumen: ResumenObservatorio = {
  project: "radar-vivienda",
  title: "Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio",
  updatedAt: new Date().toISOString(),
  kpis: {
    vutActivasValencia: 5708,
    plazasTuristicasValencia: 19886,
    vutActivasComunitat: 90065,
    altasRecientes2024a2026: 2893,
    barriosAnalizados: 88,
    barriosAlertaCriticaOAlta: 19,
    avisosCiudadanosAnalizados: 176051,
    subvencionesNominativasEur: 18595005,
    presupuestoMunicipalAnalizadoEur: 1120000000,
    gastoBienesServiciosEur: 317205917,
    snapshotsAcumulados: 1,
  },
  latestSnapshot: {
    category: "gva-viviendas-turisticas",
    datasetId: fuentes.gva_viviendas_turisticas_dataset_id,
    fileName: "2026-10-18_tur-gestur-vt.csv",
    relativePath: "data/raw/gva-viviendas-turisticas/2026-10-18_tur-gestur-vt.csv",
    sourceUrl: fuentes.gva_viviendas_turisticas_csv,
    capturedAt: new Date().toISOString(),
    sha256: "f074fb223a29ca60000000000000000000000000000000000000000000000000",
    bytes: 16212101,
  },
  topBarriosPresion: [],
  allBarrios: [],
};

export const fallbackSeries: SeriesHistoricas = {
  generatedAt: new Date().toISOString(),
  snapshotsDiff: [],
  serieAnualAltas: [],
  distritosResumen: [],
  codigosPostalesRanking: [],
};

export const fallbackAuditoria: AuditoriaFemp80 = {
  generatedAt: new Date().toISOString(),
  marcoLegal:
    "Ley 1/2022 de Transparencia y Buen Gobierno de la Comunitat Valenciana + Guía FEMP 80 Datasets Esenciales",
  canalesOficiales: {
    ...fuentes.canales_gobernanza,
    oficinaEstadisticaEmail: fuentes.oficina_estadistica_valencia.email_solicitudes,
    sedeEstadistica: fuentes.valencia_estadistica_sede,
  },
  datasetsAuditados: [
    {
      codigo: "GVA tur-gestur-vt",
      titulo: "Registro de viviendas de uso turístico vigentes (GVA)",
      packageId: fuentes.gva_viviendas_turisticas_dataset_id,
      estadoApertura: "Abierto (Sin histórico en origen)",
      desagregacionEspacial: "Dirección y código postal",
      registrosCapturados: 90065,
      incidenciaDetectada: "Sin histórico de bajas en origen.",
      accionGobernanza: "Captura longitudinal semanal automatizada.",
    },
  ],
};

export interface CityBenchmarks {
  avgIsvp: number;
  avgPresionTuristica: number;
  avgDesplazamientoComercial: number;
  avgBrechaEquidad: number;
  avgVulnerabilidad: number;
  avgDensidadVutKm2: number;
  avgVutPorBarrio: number;
  avgTerrazasPorBarrio: number;
  avgAvisosPorBarrio: number;
  countsByAlert: {
    Crítica: number;
    Alta: number;
    Moderada: number;
    Baja: number;
  };
}

export function computeCityBenchmarks(barrios: BarrioIndicators[]): CityBenchmarks {
  const n = Math.max(1, barrios.length);
  const sum = barrios.reduce(
    (acc, b) => {
      acc.isvp += b.isvp;
      acc.pt += b.presion_turistica;
      acc.dc += b.desplazamiento_comercial;
      acc.be += b.brecha_equidad_urbana;
      acc.vr += b.vulnerabilidad_residencial;
      acc.dens += b.densidad_vut_km2;
      acc.vut += b.vut_activas;
      acc.terr += b.recibos_terrazas;
      acc.avi += b.avisos_totales;
      acc.alerts[b.nivel_alerta] = (acc.alerts[b.nivel_alerta] ?? 0) + 1;
      return acc;
    },
    {
      isvp: 0,
      pt: 0,
      dc: 0,
      be: 0,
      vr: 0,
      dens: 0,
      vut: 0,
      terr: 0,
      avi: 0,
      alerts: { Crítica: 0, Alta: 0, Moderada: 0, Baja: 0 } as Record<
        BarrioIndicators["nivel_alerta"],
        number
      >,
    }
  );

  return {
    avgIsvp: Number((sum.isvp / n).toFixed(1)),
    avgPresionTuristica: Number((sum.pt / n).toFixed(1)),
    avgDesplazamientoComercial: Number((sum.dc / n).toFixed(1)),
    avgBrechaEquidad: Number((sum.be / n).toFixed(1)),
    avgVulnerabilidad: Number((sum.vr / n).toFixed(1)),
    avgDensidadVutKm2: Number((sum.dens / n).toFixed(1)),
    avgVutPorBarrio: Math.round(sum.vut / n),
    avgTerrazasPorBarrio: Math.round(sum.terr / n),
    avgAvisosPorBarrio: Math.round(sum.avi / n),
    countsByAlert: sum.alerts,
  };
}

export async function loadObservatoryData() {
  const [resumen, series, auditoria] = await Promise.all([
    loadJsonOrFallback("resumen_observatorio.json", fallbackResumen),
    loadJsonOrFallback("series_historicas.json", fallbackSeries),
    loadJsonOrFallback("auditoria_femp80.json", fallbackAuditoria),
  ]);

  const benchmarks = computeCityBenchmarks(resumen.allBarrios);
  const dataBaseUrl = import.meta.env.PUBLIC_DATA_BASE_URL ?? "/data/processed";

  return {
    resumen,
    series,
    auditoria,
    benchmarks,
    dataBaseUrl,
    fuentes,
  };
}
