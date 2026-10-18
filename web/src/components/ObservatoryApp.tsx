import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  ChevronRight,
  Filter,
  HelpCircle,
  Info,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { RadarMap } from "./RadarMap";
import { buildBarrioNarrative } from "../lib/metrics-catalog";
import type { CityBenchmarks } from "../lib/data";
import type {
  BarrioIndicators,
  MapMetricKey,
  ResumenObservatorio,
} from "../types/observatory";

interface ObservatoryAppProps {
  initialTopBarrios: BarrioIndicators[];
  initialAllBarrios: BarrioIndicators[];
  benchmarks: CityBenchmarks;
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
  if (score >= 32) return "bg-sky-600";
  return "bg-emerald-600";
}

const VECTOR_EXPLANATIONS: Record<
  Exclude<MapMetricKey, "isvp">,
  {
    title: string;
    weight: string;
    whatItMeans: string;
    avgKey: keyof Pick<
      CityBenchmarks,
      | "avgPresionTuristica"
      | "avgDesplazamientoComercial"
      | "avgBrechaEquidad"
      | "avgVulnerabilidad"
    >;
  }
> = {
  presion_turistica: {
    title: "Presión de Viviendas Turísticas",
    weight: "Peso 35%",
    whatItMeans:
      "Mide la saturación de pisos turísticos por km², plazas de alojamiento y velocidad de nuevas licencias desde 2024.",
    avgKey: "avgPresionTuristica",
  },
  desplazamiento_comercial: {
    title: "Desplazamiento Comercial y Terrazas",
    weight: "Peso 25%",
    whatItMeans:
      "Cruza la densidad de mesas y sillas de hostelería con la evolución del comercio local en el censo IAE.",
    avgKey: "avgDesplazamientoComercial",
  },
  brecha_equidad_urbana: {
    title: "Fricción en Convivencia y Avisos",
    weight: "Peso 20%",
    whatItMeans:
      "Analiza la densidad de quejas vecinales por ruido nocturno, limpieza y desperfectos viarios (FEMP Nº 11).",
    avgKey: "avgBrechaEquidad",
  },
  vulnerabilidad_residencial: {
    title: "Vulnerabilidad Social Amplificada",
    weight: "Peso 20%",
    whatItMeans:
      "Integra fragilidad socioeconómica y demográfica municipal amplificada por la presión habitacional del barrio.",
    avgKey: "avgVulnerabilidad",
  },
};

export function ObservatoryApp({
  initialTopBarrios,
  initialAllBarrios,
  benchmarks,
  dataBaseUrl = "/data/processed",
}: ObservatoryAppProps) {
  const [allBarrios, setAllBarrios] =
    useState<BarrioIndicators[]>(initialAllBarrios);
  const [topBarrios, setTopBarrios] =
    useState<BarrioIndicators[]>(initialTopBarrios);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  const [metric, setMetric] = useState<MapMetricKey>("isvp");
  const [selectedBarrioCode, setSelectedBarrioCode] = useState<string>(
    initialTopBarrios[0]?.coddistbar ?? "013"
  );
  const [compareTargetCode, setCompareTargetCode] = useState<string>("MEDIA_VLC");
  const [showVectorHelp, setShowVectorHelp] = useState<boolean>(false);

  // Filtros del explorador de los 88 barrios
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
  const [showAllRows, setShowAllRows] = useState(false);

  // Carga asíncrona del GeoJSON cartográfico y refresco opcional desde almacenamiento
  useEffect(() => {
    const base = dataBaseUrl.replace(/\/+$/, "");
    let cancelled = false;

    async function loadClientArtifacts() {
      try {
        const [geoR, resR] = await Promise.all([
          fetch(`${base}/barrios_vulnerabilidad.geojson`),
          fetch(`${base}/resumen_observatorio.json`),
        ]);
        if (cancelled) return;
        if (geoR.ok) {
          setGeojson(await geoR.json());
        }
        if (resR.ok) {
          const data = (await resR.json()) as ResumenObservatorio;
          if (Array.isArray(data.allBarrios) && data.allBarrios.length > 0) {
            setAllBarrios(data.allBarrios);
            setTopBarrios(data.topBarriosPresion);
          }
        }
      } catch {
        // Conserva datos iniciales pre-renderizados
      }
    }

    loadClientArtifacts();
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl]);

  const barriosByCode = useMemo(() => {
    const map = new Map<string, BarrioIndicators>();
    for (const b of allBarrios) {
      map.set(b.coddistbar, b);
    }
    return map;
  }, [allBarrios]);

  const selectedBarrio = useMemo(() => {
    return (
      barriosByCode.get(selectedBarrioCode) ??
      topBarrios[0] ??
      allBarrios[0]
    );
  }, [barriosByCode, selectedBarrioCode, topBarrios, allBarrios]);

  const comparedBarrio = useMemo(() => {
    if (compareTargetCode === "MEDIA_VLC") return null;
    return barriosByCode.get(compareTargetCode) ?? null;
  }, [barriosByCode, compareTargetCode]);

  const distritosList = useMemo(() => {
    const set = new Set<string>();
    for (const b of allBarrios) {
      set.add(b.distrito);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [allBarrios]);

  const filteredBarrios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allBarrios
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
  }, [allBarrios, searchQuery, selectedDistrito, selectedAlerta, sortBy]);

  const visibleBarrios = showAllRows
    ? filteredBarrios
    : filteredBarrios.slice(0, 24);

  const selectedRank = useMemo(() => {
    if (!selectedBarrio) return 1;
    const sorted = [...allBarrios].sort((a, b) => b.isvp - a.isvp);
    const idx = sorted.findIndex((x) => x.coddistbar === selectedBarrio.coddistbar);
    return idx >= 0 ? idx + 1 : 1;
  }, [allBarrios, selectedBarrio]);

  const narrativeText = useMemo(() => {
    if (!selectedBarrio) return "";
    return buildBarrioNarrative(
      selectedBarrio,
      benchmarks.avgIsvp,
      benchmarks.avgDensidadVutKm2
    );
  }, [selectedBarrio, benchmarks]);

  const handleInspectBarrio = (coddistbar: string, scrollToMap = false) => {
    setSelectedBarrioCode(coddistbar);
    if (scrollToMap && typeof window !== "undefined") {
      const el = document.getElementById("estacion-cartografica");
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div className="space-y-10">
      {/* Barra rápida de selección de barrio ("¿Qué ocurre en tu barrio?") */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Consulta directa por barrio
              </span>
              <span className="text-xs text-slate-600">
                Selecciona cualquiera de los 88 barrios oficiales de València
              </span>
            </div>
            <label
              htmlFor="quick-barrio-select"
              className="block text-sm font-bold text-slate-900"
            >
              ¿Qué barrio quieres diagnosticar hoy?
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              id="quick-barrio-select"
              value={selectedBarrio?.coddistbar ?? ""}
              onChange={(e) => setSelectedBarrioCode(e.target.value)}
              className="min-h-[42px] rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-2xs focus:border-sky-700 focus:bg-white"
            >
              {allBarrios
                .slice()
                .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
                .map((b) => (
                  <option key={b.coddistbar} value={b.coddistbar}>
                    {b.nombre} ({b.distrito}) — ISVP {b.isvp.toFixed(1)} [{b.nivel_alerta}]
                  </option>
                ))}
            </select>

            <a
              href="/metodologia"
              className="interactive-btn inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
            >
              <BookOpen className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
              <span>Guía de métricas</span>
            </a>
          </div>
        </div>

        {/* Píldoras de acceso rápido a los barrios con mayor tensión */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="mr-1 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
            Focos de mayor presión:
          </span>
          {topBarrios.slice(0, 7).map((b) => {
            const isSelected = selectedBarrio?.coddistbar === b.coddistbar;
            return (
              <button
                key={b.coddistbar}
                type="button"
                onClick={() => setSelectedBarrioCode(b.coddistbar)}
                className={`interactive-btn inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <span>{b.nombre}</span>
                <span
                  className={`rounded px-1 py-0.2 font-mono text-[10px] ${
                    isSelected
                      ? "bg-red-500/30 text-red-100"
                      : "bg-red-100 text-red-900"
                  }`}
                >
                  {b.isvp.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ESTACIÓN CARTOGRÁFICA Y FICHA DE RADIOGRAFÍA BARRIAL */}
      <section
        id="estacion-cartografica"
        aria-label="Mapa interactivo y ficha de diagnóstico del barrio seleccionado"
        className="grid gap-6 lg:grid-cols-12"
      >
        <div className="lg:col-span-7 xl:col-span-8">
          <RadarMap
            geojson={geojson}
            metric={metric}
            onMetricChange={setMetric}
            selectedBarrioCode={selectedBarrio?.coddistbar ?? null}
            onSelectBarrio={setSelectedBarrioCode}
            barriosByCode={barriosByCode}
          />
        </div>

        {/* Ficha de Radiografía Ciudadana del Barrio Seleccionado */}
        <aside
          aria-label="Radiografía detallada del barrio seleccionado"
          className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-5 xl:col-span-4"
        >
          {selectedBarrio && (
            <div className="space-y-4">
              {/* Cabecera del barrio */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-sky-800">
                    <span className="font-mono">
                      Cód. {selectedBarrio.coddistbar}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedBarrio.distrito}</span>
                    <span aria-hidden="true">·</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      Puesto #{selectedRank} de 88
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                    {selectedBarrio.nombre}
                  </h2>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getAlertBadgeStyle(
                    selectedBarrio.nivel_alerta
                  )}`}
                >
                  Alerta {selectedBarrio.nivel_alerta}
                </span>
              </div>

              {/* Resumen interpretativo en lenguaje claro */}
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <Sparkles className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
                    Interpretación en lenguaje claro
                  </span>
                  <a
                    href="/metodologia#isvp"
                    className="text-[11px] font-bold text-sky-800 underline hover:text-slate-950"
                  >
                    Ver fórmula
                  </a>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-800">
                  {narrativeText}
                </p>
              </div>

              {/* Termómetro principal ISVP + Comparador frente a Media o Barrio */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Índice Sintético ISVP
                    </span>
                    <span className="ml-1.5 text-[11px] text-slate-600">
                      (Media ciudad: {benchmarks.avgIsvp})
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-extrabold text-slate-900">
                    {selectedBarrio.isvp.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-slate-600">/ 100</span>
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

                {/* Selector de comparación directa */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 text-xs">
                  <label
                    htmlFor="compare-barrio-select"
                    className="inline-flex items-center gap-1 font-semibold text-slate-700"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
                    <span>Comparar con:</span>
                  </label>
                  <select
                    id="compare-barrio-select"
                    value={compareTargetCode}
                    onChange={(e) => setCompareTargetCode(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                  >
                    <option value="MEDIA_VLC">
                      Media de València (88 barrios — {benchmarks.avgIsvp} ptos)
                    </option>
                    {allBarrios
                      .slice()
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
                      .map((b) => (
                        <option key={b.coddistbar} value={b.coddistbar}>
                          {b.nombre} (ISVP {b.isvp.toFixed(1)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Desglose de los 4 vectores del metabolismo barrial con ayuda desplegable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Los 4 Vectores del Barrio (clic para ver en mapa)
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowVectorHelp(!showVectorHelp)}
                    className="interactive-btn inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:text-slate-950"
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{showVectorHelp ? "Ocultar ayuda" : "¿Qué miden?"}</span>
                  </button>
                </div>

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
                  ] as Array<[Exclude<MapMetricKey, "isvp">, number]>
                ).map(([key, val]) => {
                  const meta = VECTOR_EXPLANATIONS[key];
                  const referenceVal = comparedBarrio
                    ? comparedBarrio[key]
                    : benchmarks[meta.avgKey];
                  const referenceLabel = comparedBarrio
                    ? comparedBarrio.nombre
                    : "Media VLC";
                  const delta = val - referenceVal;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMetric(key)}
                      className={`interactive-btn w-full rounded-xl border p-2.5 text-left ${
                        metric === key
                          ? "border-sky-700 bg-sky-50/50 ring-1 ring-sky-700/30"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {meta.title}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                            {meta.weight}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-extrabold text-slate-900">
                            {val.toFixed(1)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              delta > 2
                                ? "text-red-700"
                                : delta < -2
                                  ? "text-emerald-700"
                                  : "text-slate-600"
                            }`}
                          >
                            ({delta >= 0 ? "+" : ""}
                            {delta.toFixed(1)} vs. {referenceLabel})
                          </span>
                        </div>
                      </div>

                      {showVectorHelp && (
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {meta.whatItMeans}
                        </p>
                      )}

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${getProgressBarColor(val)}`}
                          style={{ width: `${Math.min(100, val)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Indicadores empíricos directos del barrio */}
              <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 text-xs">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Viviendas Turísticas (GVA)
                  </span>
                  <p className="mt-0.5 font-mono text-base font-extrabold text-slate-900">
                    {selectedBarrio.vut_activas}{" "}
                    <span className="text-[11px] font-normal text-slate-600">
                      ({selectedBarrio.plazas_vut} plazas)
                    </span>
                  </p>
                  <span className="font-mono text-[11px] font-semibold text-amber-800">
                    {selectedBarrio.densidad_vut_km2} VUT/km² (+
                    {selectedBarrio.vut_altas_recientes} desde 2024)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Terrazas y Comercio IAE
                  </span>
                  <p className="mt-0.5 font-mono text-base font-extrabold text-slate-900">
                    {selectedBarrio.recibos_terrazas}{" "}
                    <span className="text-[11px] font-normal text-slate-600">
                      terrazas
                    </span>
                  </p>
                  <span className="font-mono text-[11px] text-slate-700">
                    IAE: {selectedBarrio.recibos_iae} recibos (
                    <strong
                      className={
                        selectedBarrio.variacion_iae_pct < 0
                          ? "text-red-700"
                          : "text-emerald-700"
                      }
                    >
                      {selectedBarrio.variacion_iae_pct >= 0 ? "+" : ""}
                      {selectedBarrio.variacion_iae_pct}%
                    </strong>
                    )
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Quejas Ruido y Convivencia
                  </span>
                  <p className="mt-0.5 font-mono text-base font-extrabold text-slate-900">
                    {selectedBarrio.avisos_ruido_convivencia.toLocaleString("es-ES")}
                  </p>
                  <span className="text-[11px] text-slate-600">
                    de {selectedBarrio.avisos_totales.toLocaleString("es-ES")} avisos totales
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Deterioro Viario / Vulnerab.
                  </span>
                  <p className="mt-0.5 font-mono text-base font-extrabold text-slate-900">
                    {selectedBarrio.avisos_deterioro_viario.toLocaleString("es-ES")}{" "}
                    <span className="text-[11px] font-normal text-slate-600">
                      avisos vía
                    </span>
                  </p>
                  <span className="text-[11px] font-medium text-slate-700">
                    Base mun.: {selectedBarrio.etiqueta_vulnerabilidad_municipal}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            <a
              href="/metodologia#glosario-metricas"
              className="interactive-btn flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-700" aria-hidden="true" />
                <span>Explicación detallada de cada indicador y fuente</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </section>

      {/* EXPLORADOR COMPLETO DE LOS 88 BARRIOS (Tabla en Escritorio + Tarjetas en Móvil) */}
      <section
        id="explorador-barrios"
        aria-labelledby="heading-explorador-barrios"
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider text-sky-800 uppercase">
              Catálogo Territorial Completo · 88 Barrios Oficiales
            </span>
            <h2
              id="heading-explorador-barrios"
              className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
            >
              Explorador y Ranking Comparativo por Barrios
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Filtra por distrito o nivel de alerta y haz clic en cualquier barrio
              para centrar el mapa y abrir su ficha de diagnóstico.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-900 border border-red-200">
              Crítica: <strong>{benchmarks.countsByAlert.Crítica}</strong>
            </span>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 border border-amber-200">
              Alta: <strong>{benchmarks.countsByAlert.Alta}</strong>
            </span>
            <span className="rounded-lg bg-sky-50 px-2.5 py-1 font-semibold text-sky-900 border border-sky-200">
              Moderada: <strong>{benchmarks.countsByAlert.Moderada}</strong>
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-900 border border-emerald-200">
              Baja: <strong>{benchmarks.countsByAlert.Baja}</strong>
            </span>
          </div>
        </div>

        {/* Controles de búsqueda, filtro y ordenación */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar barrio, distrito o código (ej. Russafa, Cabanyal, Benimaclet, 021)..."
              aria-label="Buscar barrio, distrito o código"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-500 focus:border-sky-700 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Filter className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
              <label htmlFor="filter-distrito">Distrito:</label>
            </div>
            <select
              id="filter-distrito"
              value={selectedDistrito}
              onChange={(e) => setSelectedDistrito(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
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
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="TODAS">Todas las alertas</option>
              <option value="Crítica">Alerta Crítica (≥ 62)</option>
              <option value="Alta">Alerta Alta (46–61,9)</option>
              <option value="Moderada">Alerta Moderada (32–45,9)</option>
              <option value="Baja">Alerta Baja (&lt; 32)</option>
            </select>

            <label
              htmlFor="sort-barrios"
              className="text-xs font-semibold text-slate-700"
            >
              Ordenar por:
            </label>
            <select
              id="sort-barrios"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
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

        {/* VISTA MÓVIL: Tarjetas escaneables sin scroll horizontal forzado (< md) */}
        <div className="mt-4 grid gap-3 md:hidden">
          {visibleBarrios.map((b) => {
            const isSelected = selectedBarrio?.coddistbar === b.coddistbar;
            return (
              <div
                key={b.coddistbar}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? "border-sky-700 bg-sky-50/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-semibold text-slate-600">
                      #{b.coddistbar} · {b.distrito}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {b.nombre}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${getAlertBadgeStyle(
                      b.nivel_alerta
                    )}`}
                  >
                    ISVP {b.isvp.toFixed(1)} · {b.nivel_alerta}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-600">
                      VUT (Plazas)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {b.vut_activas} ({b.plazas_vut})
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-600">
                      Densidad
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {b.densidad_vut_km2.toFixed(1)}/km²
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-600">
                      Terrazas / Avisos
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {b.recibos_terrazas} / {b.avisos_totales}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleInspectBarrio(b.coddistbar, true)}
                  className="interactive-btn mt-3 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                >
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Inspeccionar barrio en el mapa</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* VISTA ESCRITORIO: Tabla analítica de alta densidad (≥ md) */}
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                <th className="px-3 py-3">Cód.</th>
                <th className="px-3 py-3">Barrio</th>
                <th className="px-3 py-3">Distrito</th>
                <th className="px-3 py-3 text-right">ISVP (0–100)</th>
                <th className="px-3 py-3">Nivel Alerta</th>
                <th className="px-3 py-3 text-right">VUT (Plazas)</th>
                <th className="px-3 py-3 text-right">VUT / km²</th>
                <th className="px-3 py-3 text-right">Terrazas</th>
                <th className="px-3 py-3 text-right">Censo IAE (Var.)</th>
                <th className="px-3 py-3 text-right">Avisos (Ruido / Vía)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {visibleBarrios.map((b) => {
                const isSelected = selectedBarrio?.coddistbar === b.coddistbar;
                return (
                  <tr
                    key={b.coddistbar}
                    onClick={() => handleInspectBarrio(b.coddistbar, false)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-sky-50/90 font-semibold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-slate-600">
                      {b.coddistbar}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      {b.nombre}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{b.distrito}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-extrabold text-slate-900">
                      {b.isvp.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getAlertBadgeStyle(
                          b.nivel_alerta
                        )}`}
                      >
                        {b.nivel_alerta}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-900">
                      <strong>{b.vut_activas}</strong>{" "}
                      <span className="text-slate-600">({b.plazas_vut})</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
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
                            ? "font-bold text-red-700"
                            : "font-semibold text-emerald-700"
                        }
                      >
                        ({b.variacion_iae_pct >= 0 ? "+" : ""}
                        {b.variacion_iae_pct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                      <strong>{b.avisos_totales.toLocaleString("es-ES")}</strong>{" "}
                      <span className="text-[11px] text-slate-600">
                        ({b.avisos_ruido_convivencia} / {b.avisos_deterioro_viario})
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pie del explorador con botón de mostrar los 88 barrios */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600">
          <p>
            Mostrando <strong>{visibleBarrios.length}</strong> de{" "}
            <strong>{filteredBarrios.length}</strong> barrios seleccionados.
          </p>
          {filteredBarrios.length > 24 && (
            <button
              type="button"
              onClick={() => setShowAllRows(!showAllRows)}
              className="interactive-btn rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-200"
            >
              {showAllRows
                ? "Mostrar primeros 24 barrios"
                : `Ver los ${filteredBarrios.length} barrios completos`}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
