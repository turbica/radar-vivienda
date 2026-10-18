import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Info,
  MapPin,
  Megaphone,
  Scale,
  Search,
  ShieldAlert,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { METRIC_CONFIG, RadarMap } from "./RadarMap";
import type {
  AuditoriaFemp80,
  BarrioIndicators,
  DatasetAuditItem,
  MapMetricKey,
  ResumenObservatorio,
  SeriesHistoricas,
} from "../types/observatory";

interface ObservatoryAppProps {
  initialResumen: ResumenObservatorio;
  initialSeries: SeriesHistoricas;
  initialAuditoria: AuditoriaFemp80;
  initialGeojson: GeoJSON.FeatureCollection | null;
  dataBaseUrl?: string;
}

function getAlertBadgeStyle(nivel: BarrioIndicators["nivel_alerta"]) {
  switch (nivel) {
    case "Crítica":
      return "bg-red-100 text-red-900 border-red-300";
    case "Alta":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "Moderada":
      return "bg-sky-100 text-sky-900 border-sky-300";
    default:
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
  }
}

function getProgressBarColor(score: number) {
  if (score >= 62) return "bg-red-600";
  if (score >= 46) return "bg-amber-600";
  if (score >= 32) return "bg-blue-600";
  return "bg-emerald-600";
}

export function ObservatoryApp({
  initialResumen,
  initialSeries,
  initialAuditoria,
  initialGeojson,
  dataBaseUrl = "/data/processed",
}: ObservatoryAppProps) {
  const [resumen, setResumen] = useState<ResumenObservatorio>(initialResumen);
  const [series, setSeries] = useState<SeriesHistoricas>(initialSeries);
  const [auditoria, setAuditoria] = useState<AuditoriaFemp80>(initialAuditoria);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(
    initialGeojson
  );

  const [metric, setMetric] = useState<MapMetricKey>("isvp");
  const [selectedBarrioCode, setSelectedBarrioCode] = useState<string>(
    initialResumen.topBarriosPresion[0]?.coddistbar ?? "021"
  );
  const [activeTab, setActiveTab] = useState<
    "barrios" | "series" | "gobernanza"
  >("barrios");

  // Filtros de la tabla de barrios
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrito, setSelectedDistrito] = useState<string>("TODOS");
  const [selectedAlerta, setSelectedAlerta] = useState<string>("TODAS");
  const [sortBy, setSortBy] = useState<
    | "isvp"
    | "vut_activas"
    | "densidad_vut_km2"
    | "recibos_terrazas"
    | "avisos_totales"
    | "variacion_iae_pct"
  >("isvp");

  // Estado del generador de solicitudes formales Ley 1/2022
  const [selectedAuditItem, setSelectedAuditItem] = useState<DatasetAuditItem>(
    initialAuditoria.datasetsAuditados[2] ?? initialAuditoria.datasetsAuditados[0]!
  );
  const [copiedRequest, setCopiedRequest] = useState(false);

  // Hidratación cliente opcional desde /data/processed o bucket Cloud Storage (PUBLIC_DATA_BASE_URL)
  useEffect(() => {
    const base = dataBaseUrl.replace(/\/+$/, "");
    let cancelled = false;

    async function refreshFromStorage() {
      try {
        const [resR, serR, audR, geoR] = await Promise.all([
          fetch(`${base}/resumen_observatorio.json`),
          fetch(`${base}/series_historicas.json`),
          fetch(`${base}/auditoria_femp80.json`),
          fetch(`${base}/barrios_vulnerabilidad.geojson`),
        ]);
        if (cancelled) return;
        if (resR.ok) setResumen(await resR.json());
        if (serR.ok) setSeries(await serR.json());
        if (audR.ok) setAuditoria(await audR.json());
        if (geoR.ok) setGeojson(await geoR.json());
      } catch {
        // Mantiene los datos pre-renderizados si estamos offline
      }
    }

    refreshFromStorage();
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl]);

  const barriosByCode = useMemo(() => {
    const map = new Map<string, BarrioIndicators>();
    for (const b of resumen.allBarrios) {
      map.set(b.coddistbar, b);
    }
    return map;
  }, [resumen.allBarrios]);

  const selectedBarrio = useMemo(() => {
    return (
      barriosByCode.get(selectedBarrioCode) ??
      resumen.topBarriosPresion[0] ??
      resumen.allBarrios[0]
    );
  }, [barriosByCode, selectedBarrioCode, resumen]);

  const distritosList = useMemo(() => {
    const set = new Set<string>();
    for (const b of resumen.allBarrios) {
      set.add(b.distrito);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [resumen.allBarrios]);

  const filteredBarrios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resumen.allBarrios
      .filter((b) => {
        if (selectedDistrito !== "TODOS" && b.distrito !== selectedDistrito) {
          return false;
        }
        if (selectedAlerta !== "TODAS" && b.nivel_alerta !== selectedAlerta) {
          return false;
        }
        if (q) {
          const matchName = b.nombre.toLowerCase().includes(q);
          const matchDist = b.distrito.toLowerCase().includes(q);
          const matchCode = b.coddistbar.includes(q);
          return matchName || matchDist || matchCode;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "variacion_iae_pct") {
          return a.variacion_iae_pct - b.variacion_iae_pct;
        }
        return b[sortBy] - a[sortBy];
      });
  }, [resumen.allBarrios, searchQuery, selectedDistrito, selectedAlerta, sortBy]);

  const formalRequestTemplate = useMemo(() => {
    return `ASUNTO: Solicitud de apertura / desagregación territorial de datos públicos (${selectedAuditItem.codigo} - ${selectedAuditItem.titulo})

A la atención del Servicio de Transparencia y Gobierno Abierto / Oficina de Estadística:

Al amparo de la Ley 1/2022, de 13 de abril, de Transparencia y Buen Gobierno de la Comunitat Valenciana, y en alineación con la Guía de los 80 Conjuntos de Datos Esenciales de la FEMP, desde el observatorio ciudadano abierto "Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio" (https://github.com/turbica/radar-vivienda) hemos auditado el conjunto de datos:

- Identificador en catálogo CKAN: ${selectedAuditItem.packageId}
- Estado actual verificado: ${selectedAuditItem.estadoApertura} (${selectedAuditItem.desagregacionEspacial})
- Limitación técnica detectada: ${selectedAuditItem.incidenciaDetectada}

SOLICITAMOS:
${selectedAuditItem.accionGobernanza}

En formato abierto, reutilizable y legible por máquina (CSV / GeoJSON / Parquet) a través de la API CKAN municipal/autonómica (/api/3/action), preservando en todo momento la disociación de datos personales conforme al RGPD.

En València, a ${new Date().toLocaleDateString("es-ES")}.`;
  }, [selectedAuditItem]);

  const handleCopyFormalRequest = async () => {
    try {
      await navigator.clipboard.writeText(formalRequestTemplate);
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2200);
    } catch {
      // Fallback silencioso
    }
  };

  const baseDownloadUrl = dataBaseUrl.replace(/\/+$/, "");

  return (
    <div className="space-y-8">
      {/* Barra superior de trazabilidad y descargas abiertas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
            <Database className="h-3 w-3" aria-hidden="true" />
            SNAPSHOT ACTIVO
          </span>
          <span className="font-mono font-semibold text-slate-900">
            {resumen.latestSnapshot.fileName}
          </span>
          <span className="text-slate-500">·</span>
          <span title="Hash criptográfico SHA-256 de la captura en data/raw/">
            SHA-256:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
              {resumen.latestSnapshot.sha256.slice(0, 16)}…
            </code>
          </span>
          <span className="text-slate-500">·</span>
          <span>
            Series acumuladas:{" "}
            <strong className="font-mono text-slate-900">
              {resumen.kpis.snapshotsAcumulados}
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-600">
            Datos procesados (AGPL-3.0):
          </span>
          <a
            href={`${baseDownloadUrl}/barrios_vulnerabilidad.geojson`}
            download="barrios_vulnerabilidad.geojson"
            className="interactive-btn inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-slate-800 hover:bg-slate-100"
          >
            <Download className="h-3 w-3 text-blue-700" aria-hidden="true" />
            GeoJSON
          </a>
          <a
            href={`${baseDownloadUrl}/viviendas_turisticas_valencia.parquet`}
            download="viviendas_turisticas_valencia.parquet"
            className="interactive-btn inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-slate-800 hover:bg-slate-100"
          >
            <FileSpreadsheet className="h-3 w-3 text-blue-700" aria-hidden="true" />
            Parquet
          </a>
          <a
            href={`${baseDownloadUrl}/resumen_observatorio.json`}
            download="resumen_observatorio.json"
            className="interactive-btn inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-slate-800 hover:bg-slate-100"
          >
            <Download className="h-3 w-3 text-blue-700" aria-hidden="true" />
            JSON
          </a>
        </div>
      </div>

      {/* Tarjetas KPI de Diagnóstico Urbano */}
      <section
        aria-label="Indicadores clave del observatorio"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="interactive-card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Viviendas Turísticas (VUT)
            </span>
            <Building2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900">
            {resumen.kpis.vutActivasValencia.toLocaleString("es-ES")}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            <strong className="font-mono text-slate-900">
              {resumen.kpis.plazasTuristicasValencia.toLocaleString("es-ES")}
            </strong>{" "}
            plazas en València (
            <span className="font-mono font-semibold text-amber-800">
              +{resumen.kpis.altasRecientes2024a2026.toLocaleString("es-ES")}
            </span>{" "}
            desde 2024)
          </p>
        </div>

        <div className="interactive-card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Barrios en Alerta (ISVP)
            </span>
            <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-red-700">
            {resumen.kpis.barriosAlertaCriticaOAlta}{" "}
            <span className="text-lg font-normal text-slate-500">
              / {resumen.kpis.barriosAnalizados}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Barrios con presión residencial y desplazamiento comercial alto o crítico
          </p>
        </div>

        <div className="interactive-card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Avisos y Quejas (FEMP Nº 11)
            </span>
            <Megaphone className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900">
            {resumen.kpis.avisosCiudadanosAnalizados.toLocaleString("es-ES")}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Comunicaciones vecinales cruzadas por ruido, limpieza y deterioro viario
          </p>
        </div>

        <div className="interactive-card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Gasto y Ayudas (FEMP 12 y 40)
            </span>
            <Scale className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900">
            {(resumen.kpis.gastoBienesServiciosEur / 1_000_000).toFixed(1)} M€
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Gasto corriente en bienes y servicios ·{" "}
            <strong className="font-mono text-slate-800">
              {(resumen.kpis.subvencionesNominativasEur / 1_000_000).toFixed(1)} M€
            </strong>{" "}
            en subvenciones
          </p>
        </div>
      </section>

      {/* Bloque Principal: Mapa Interactivo + Ficha de Diagnóstico del Barrio Seleccionado */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RadarMap
            geojson={geojson}
            metric={metric}
            onMetricChange={setMetric}
            selectedBarrioCode={selectedBarrio?.coddistbar ?? null}
            onSelectBarrio={setSelectedBarrioCode}
            barriosByCode={barriosByCode}
          />
        </div>

        {/* Panel lateral de radiografía del barrio seleccionado */}
        <aside
          aria-label="Diagnóstico del barrio seleccionado"
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4"
        >
          {selectedBarrio && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-mono">
                      Barrio #{selectedBarrio.coddistbar}
                    </span>
                    <span>·</span>
                    <span>{selectedBarrio.distrito}</span>
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedBarrio.nombre}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${getAlertBadgeStyle(
                    selectedBarrio.nivel_alerta
                  )}`}
                >
                  Alerta {selectedBarrio.nivel_alerta}
                </span>
              </div>

              {/* Puntuación sintética ISVP */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Índice Sintético ISVP
                  </span>
                  <span className="font-mono text-2xl font-bold text-slate-900">
                    {selectedBarrio.isvp.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-slate-500">/ 100</span>
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${getProgressBarColor(
                      selectedBarrio.isvp
                    )}`}
                    style={{ width: `${Math.min(100, selectedBarrio.isvp)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600">
                  Clasificación estadística municipal base:{" "}
                  <strong className="text-slate-800">
                    {selectedBarrio.etiqueta_vulnerabilidad_municipal} (
                    {selectedBarrio.ind_vulnerabilidad_municipal.toFixed(1)})
                  </strong>
                </p>
              </div>

              {/* Desglose de los 4 vectores del metabolismo barrial */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Vectores de Presión y Equidad (0–100)
                </p>

                {(
                  [
                    ["presion_turistica", selectedBarrio.presion_turistica],
                    [
                      "desplazamiento_comercial",
                      selectedBarrio.desplazamiento_comercial,
                    ],
                    ["brecha_equidad_urbana", selectedBarrio.brecha_equidad_urbana],
                    [
                      "vulnerabilidad_residencial",
                      selectedBarrio.vulnerabilidad_residencial,
                    ],
                  ] as Array<[MapMetricKey, number]>
                ).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetric(key)}
                    className={`interactive-btn w-full rounded-lg border p-2 text-left ${
                      metric === key
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {METRIC_CONFIG[key].shortLabel}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {val.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${getProgressBarColor(val)}`}
                        style={{ width: `${Math.min(100, val)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* Métricas empíricas cruzadas del barrio */}
              <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500">VUT Vigentes GVA</span>
                  <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                    {selectedBarrio.vut_activas}{" "}
                    <span className="text-[11px] font-normal text-slate-600">
                      ({selectedBarrio.plazas_vut} plazas)
                    </span>
                  </p>
                  <span className="font-mono text-[11px] text-amber-800">
                    {selectedBarrio.densidad_vut_km2} VUT/km²
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500">
                    Censo IAE / Terrazas
                  </span>
                  <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                    {selectedBarrio.recibos_terrazas}{" "}
                    <span className="text-[11px] font-normal text-slate-600">
                      terrazas
                    </span>
                  </p>
                  <span className="font-mono text-[11px] text-slate-700">
                    IAE: {selectedBarrio.recibos_iae} (
                    {selectedBarrio.variacion_iae_pct >= 0 ? "+" : ""}
                    {selectedBarrio.variacion_iae_pct}%)
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500">
                    Avisos Ruido y Ocio
                  </span>
                  <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                    {selectedBarrio.avisos_ruido_convivencia.toLocaleString("es-ES")}
                  </p>
                  <span className="text-[11px] text-slate-600">
                    de {selectedBarrio.avisos_totales.toLocaleString("es-ES")} quejas
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500">
                    Deterioro y Limpieza
                  </span>
                  <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                    {selectedBarrio.avisos_deterioro_viario.toLocaleString("es-ES")}
                  </p>
                  <span className="font-mono text-[11px] text-slate-600">
                    Sup: {selectedBarrio.area_km2} km²
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Selector rápido de barrios críticos */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Top 5 Barrios con Mayor Presión (clic para inspeccionar):
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {resumen.topBarriosPresion.slice(0, 5).map((b) => (
                <button
                  key={b.coddistbar}
                  type="button"
                  onClick={() => setSelectedBarrioCode(b.coddistbar)}
                  className={`interactive-btn rounded-md border px-2 py-1 text-xs font-medium ${
                    selectedBarrio?.coddistbar === b.coddistbar
                      ? "border-blue-800 bg-blue-800 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {b.nombre}{" "}
                  <span className="font-mono text-[11px] opacity-85">
                    ({b.isvp.toFixed(0)})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {/* Pestañas de Análisis Profundo: Ranking 88 Barrios | Series Temporales | Gobernanza FEMP 80 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div
          className="flex flex-wrap border-b border-slate-200 bg-slate-50/70 px-4 pt-3"
          role="tablist"
          aria-label="Secciones de análisis del observatorio"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "barrios"}
            onClick={() => setActiveTab("barrios")}
            className={`interactive-btn flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
              activeTab === "barrios"
                ? "border-blue-800 text-blue-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="h-4 w-4" aria-hidden="true" />
            <span>Explorador de Barrios ({resumen.allBarrios.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "series"}
            onClick={() => setActiveTab("series")}
            className={`interactive-btn flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
              activeTab === "series"
                ? "border-blue-800 text-blue-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            <span>Series Históricas, Distritos y Códigos Postales</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "gobernanza"}
            onClick={() => setActiveTab("gobernanza")}
            className={`interactive-btn flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
              activeTab === "gobernanza"
                ? "border-blue-800 text-blue-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span>Auditoría FEMP 80 y Gobernanza (Ley 1/2022)</span>
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: EXPLORADOR Y RANKING DE LOS 88 BARRIOS */}
          {activeTab === "barrios" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <Search
                    className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar barrio, distrito o código (ej. Russafa, Cabanyal, 021)..."
                    aria-label="Buscar barrio, distrito o código"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    <label htmlFor="filter-distrito">Distrito:</label>
                  </div>
                  <select
                    id="filter-distrito"
                    value={selectedDistrito}
                    onChange={(e) => setSelectedDistrito(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none"
                  >
                    <option value="TODOS">Todos los distritos (19)</option>
                    {distritosList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="filter-alerta" className="sr-only">
                    Nivel de alerta
                  </label>
                  <select
                    id="filter-alerta"
                    value={selectedAlerta}
                    onChange={(e) => setSelectedAlerta(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none"
                  >
                    <option value="TODAS">Todas las alertas</option>
                    <option value="Crítica">Alerta Crítica</option>
                    <option value="Alta">Alerta Alta</option>
                    <option value="Moderada">Alerta Moderada</option>
                    <option value="Baja">Alerta Baja</option>
                  </select>

                  <label htmlFor="sort-barrios" className="text-xs font-medium text-slate-600">
                    Ordenar por:
                  </label>
                  <select
                    id="sort-barrios"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as typeof sortBy)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none"
                  >
                    <option value="isvp">Índice Global ISVP (Mayor a menor)</option>
                    <option value="vut_activas">Viviendas Turísticas (VUT)</option>
                    <option value="densidad_vut_km2">Densidad VUT / km²</option>
                    <option value="recibos_terrazas">Terrazas hosteleras</option>
                    <option value="avisos_totales">Avisos y quejas vecinales</option>
                    <option value="variacion_iae_pct">Caída actividad IAE (%)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
                      <th className="px-3 py-3">Cód.</th>
                      <th className="px-3 py-3">Barrio</th>
                      <th className="px-3 py-3">Distrito</th>
                      <th className="px-3 py-3 text-right">ISVP</th>
                      <th className="px-3 py-3">Nivel</th>
                      <th className="px-3 py-3 text-right">VUT (Plazas)</th>
                      <th className="px-3 py-3 text-right">VUT / km²</th>
                      <th className="px-3 py-3 text-right">Terrazas</th>
                      <th className="px-3 py-3 text-right">Recibos IAE (Var.)</th>
                      <th className="px-3 py-3 text-right">Avisos (Ruido / Vía)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredBarrios.slice(0, 45).map((b) => {
                      const isSelected = selectedBarrio?.coddistbar === b.coddistbar;
                      return (
                        <tr
                          key={b.coddistbar}
                          onClick={() => setSelectedBarrioCode(b.coddistbar)}
                          className={`cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? "bg-blue-50/90 font-medium"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono text-slate-500">
                            {b.coddistbar}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">
                            {b.nombre}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{b.distrito}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {b.isvp.toFixed(1)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getAlertBadgeStyle(
                                b.nivel_alerta
                              )}`}
                            >
                              {b.nivel_alerta}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                            <strong>{b.vut_activas}</strong>{" "}
                            <span className="text-slate-500">({b.plazas_vut})</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                            {b.densidad_vut_km2.toFixed(1)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                            {b.recibos_terrazas}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">
                            <span className="text-slate-800">{b.recibos_iae}</span>{" "}
                            <span
                              className={
                                b.variacion_iae_pct < 0
                                  ? "font-semibold text-red-700"
                                  : "text-emerald-700"
                              }
                            >
                              ({b.variacion_iae_pct >= 0 ? "+" : ""}
                              {b.variacion_iae_pct}%)
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            <strong>{b.avisos_totales.toLocaleString("es-ES")}</strong>{" "}
                            <span className="text-[11px] text-slate-500">
                              ({b.avisos_ruido_convivencia} / {b.avisos_deterioro_viario})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                Mostrando {Math.min(45, filteredBarrios.length)} de{" "}
                {filteredBarrios.length} barrios filtrados. Haz clic en cualquier fila
                para centrar el mapa e inspeccionar el detalle del barrio.
              </p>
            </div>
          )}

          {/* TAB 2: SERIES HISTÓRICAS, DISTRITOS Y CÓDIGOS POSTALES */}
          {activeTab === "series" && (
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Gráfico 1: Evolución anual de licencias VUT en València (2015-2026) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Velocidad de Concentración: Altas Anuales y Stock Vigente en València (2015–2026)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Reconstrucción longitudinal a partir de las fechas de alta (`fecha_alta`) del registro vivo `tur-gestur-vt` de la GVA.
                  </p>
                  <div className="mt-4 h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={series.serieAnualAltas}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="anio"
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 11, fill: "#1e40af" }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 11, fill: "#d97706" }}
                        />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar
                          yAxisId="left"
                          dataKey="nuevas_licencias"
                          name="Nuevas altas anuales (VUT)"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="stock_acumulado_vigente"
                          name="Stock acumulado vigente"
                          stroke="#d97706"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2: Comparativa por Distritos (VUT vs Terrazas) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Presión por Distritos: Viviendas Turísticas vs. Ocupación de Terrazas
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Comparativa de los 10 distritos con mayor parque de pisos turísticos frente a licencias de mesas y sillas (FEMP Nº 20).
                  </p>
                  <div className="mt-4 h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={series.distritosResumen.slice(0, 10)}
                        layout="vertical"
                        margin={{ left: 35, right: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="distrito"
                          width={120}
                          tick={{ fontSize: 11, fill: "#0f172a" }}
                        />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar
                          dataKey="vut_activas"
                          name="VUT vigentes"
                          fill="#1e40af"
                          radius={[0, 4, 4, 0]}
                        />
                        <Bar
                          dataKey="recibos_terrazas"
                          name="Recibos Terrazas"
                          fill="#f59e0b"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Registro de Instantáneas Diferenciales + Ranking por Código Postal */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Registro Longitudinal de Instantáneas Semanales (`data/raw/`)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Cada captura semanal del CSV de la GVA se compara mediante SQL (`EXCEPT`) en DuckDB para detectar altas y bajas de signaturas turísticas.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                          <th className="px-3 py-2.5">Instantánea</th>
                          <th className="px-3 py-2.5 text-right">VUT València</th>
                          <th className="px-3 py-2.5 text-right">Plazas</th>
                          <th className="px-3 py-2.5 text-right">Altas / Bajas</th>
                          <th className="px-3 py-2.5">SHA-256</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {series.snapshotsDiff.map((s) => (
                          <tr key={s.snapshotFile}>
                            <td className="px-3 py-2.5 font-mono font-medium text-slate-900">
                              {s.snapshotFile}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                              {s.vutActivasValencia.toLocaleString("es-ES")}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                              {s.plazasValencia.toLocaleString("es-ES")}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              <span className="text-emerald-700">
                                +{s.altasRespectoAnterior}
                              </span>{" "}
                              /{" "}
                              <span className="text-red-700">
                                -{s.bajasRespectoAnterior}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                              {s.sha256.slice(0, 12)}…
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Top Códigos Postales con Mayor Concentración de VUT en València
                  </h3>
                  <p className="text-xs text-slate-600">
                    Desglose directo por código postal (`46001`–`46026`) extraído con DuckDB sobre la última instantánea de `tur-gestur-vt`.
                  </p>
                  <div className="max-h-[260px] overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                          <th className="px-3 py-2">Código Postal</th>
                          <th className="px-3 py-2 text-right">VUT Vigentes</th>
                          <th className="px-3 py-2 text-right">Plazas</th>
                          <th className="px-3 py-2 text-right">Altas 2024–26</th>
                          <th className="px-3 py-2 text-right">Sup. Media</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {series.codigosPostalesRanking.slice(0, 12).map((cp) => (
                          <tr key={cp.cp} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-blue-900">
                              {cp.cp}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                              {cp.vut_activas.toLocaleString("es-ES")}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">
                              {cp.plazas_vut.toLocaleString("es-ES")}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-amber-800">
                              +{cp.altas_recientes.toLocaleString("es-ES")}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">
                              {cp.superficie_media > 0
                                ? `${cp.superficie_media} m²`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOBERNANZA DE DATOS ABIERTOS Y AUDITORÍA FEMP 80 */}
          {activeTab === "gobernanza" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <div className="space-y-1 text-xs text-slate-800">
                    <p className="text-sm font-bold text-slate-900">
                      Auditoría Ciudadana de Calidad y Desagregación del Dato Público ({auditoria.marcoLegal})
                    </p>
                    <p>
                      Tal y como establece la gobernanza de <strong>radar-vivienda</strong>, cuando un dataset clave llega con retraso o carece de desagregación por barrio/sección censal, la plataforma audita públicamente la carencia y facilita la presentación de solicitudes formales ante el Ayuntamiento de València, la Oficina de Estadística y el portal Dades Obertes GVA.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                {/* Matriz de datasets auditados */}
                <div className="space-y-3 lg:col-span-7">
                  <h3 className="text-sm font-bold text-slate-900">
                    Estado de Apertura y Desagregación Territorial (Catálogos CKAN)
                  </h3>
                  <div className="space-y-3">
                    {auditoria.datasetsAuditados.map((item) => {
                      const isSelected = selectedAuditItem.codigo === item.codigo;
                      const isPartial =
                        item.estadoApertura.toLowerCase().includes("parcial") ||
                        item.estadoApertura.toLowerCase().includes("sin histórico");
                      return (
                        <div
                          key={item.codigo}
                          onClick={() => setSelectedAuditItem(item)}
                          className={`cursor-pointer rounded-xl border p-4 transition-colors duration-150 ${
                            isSelected
                              ? "border-blue-700 bg-blue-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-blue-900">
                              {item.codigo} · {item.packageId}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                isPartial
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-900"
                              }`}
                            >
                              {item.estadoApertura}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {item.titulo}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            <strong>Desagregación actual:</strong>{" "}
                            {item.desagregacionEspacial}
                          </p>
                          <p className="mt-1 text-xs text-red-800">
                            <strong>Brecha detectada:</strong>{" "}
                            {item.incidenciaDetectada}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generador interactivo de solicitud formal de apertura de datos */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase">
                        <Info className="h-4 w-4" aria-hidden="true" />
                        Generador de Solicitud Formal (Ley 1/2022)
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-600">
                        {selectedAuditItem.codigo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Selecciona cualquier dataset en la columna izquierda para generar el escrito técnico de solicitud de apertura o desagregación barrial listo para registrar:
                    </p>
                    <textarea
                      readOnly
                      value={formalRequestTemplate}
                      rows={14}
                      aria-label="Texto de solicitud formal de datos abiertos"
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleCopyFormalRequest}
                      className="interactive-btn flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-900"
                    >
                      {copiedRequest ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span>Solicitud copiada al portapapeles</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          <span>Copiar texto de solicitud formal</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <a
                        href={auditoria.canalesOficiales.solicitud_datos_ayuntamiento}
                        target="_blank"
                        rel="noreferrer"
                        className="interactive-btn flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
                      >
                        <span>Portal Ayuntamiento</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <a
                        href={`mailto:${auditoria.canalesOficiales.oficinaEstadisticaEmail}?subject=${encodeURIComponent(
                          `Solicitud de datos desagregados por barrio (${selectedAuditItem.codigo})`
                        )}&body=${encodeURIComponent(formalRequestTemplate)}`}
                        className="interactive-btn flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
                      >
                        <span>Oficina Estadística</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
