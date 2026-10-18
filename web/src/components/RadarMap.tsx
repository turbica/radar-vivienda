import { useEffect, useRef, useState } from "react";
import type maplibreglType from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BookOpen, Box, Compass, Layers } from "lucide-react";
import type { BarrioIndicators, MapMetricKey } from "../types/observatory";

export const METRIC_CONFIG: Record<
  MapMetricKey,
  {
    label: string;
    shortLabel: string;
    weightBadge: string;
    unit: string;
    description: string;
    citizenHint: string;
    stops: Array<[number, string]>;
  }
> = {
  isvp: {
    label: "Índice Sintético de Vulnerabilidad y Presión (ISVP)",
    shortLabel: "ISVP Global",
    weightBadge: "100%",
    unit: "/ 100",
    description:
      "Índice compuesto que pondera presión turística (35%), desplazamiento comercial (25%), quejas vecinales de convivencia/deterioro (20%) y vulnerabilidad social (20%).",
    citizenHint:
      "Valores ≥ 46 indican alerta alta; valores ≥ 62 indican saturación crítica acumulada.",
    stops: [
      [0, "#e0f2fe"],
      [25, "#7dd3fc"],
      [40, "#fbbf24"],
      [55, "#f97316"],
      [70, "#dc2626"],
      [85, "#7f1d1d"],
    ],
  },
  presion_turistica: {
    label: "Vector 1 · Presión Residencial de Viviendas Turísticas",
    shortLabel: "Presión Turística",
    weightBadge: "35%",
    unit: "/ 100",
    description:
      "Calculado a partir de la densidad de licencias VUT por km², plazas turísticas ofertadas y velocidad de nuevas altas (2024–2026) en el registro GVA.",
    citizenHint:
      "Mide la competencia directa del alquiler turístico sobre el parque de vivienda habitual.",
    stops: [
      [0, "#f0fdf4"],
      [20, "#86efac"],
      [45, "#facc15"],
      [65, "#ea580c"],
      [85, "#991b1b"],
    ],
  },
  desplazamiento_comercial: {
    label: "Vector 2 · Desplazamiento Comercial y Terrazas",
    shortLabel: "Comercio y Terrazas",
    weightBadge: "25%",
    unit: "/ 100",
    description:
      "Cruza la variación de recibos del Impuesto de Actividades Económicas (IAE, FEMP Nº 20) con la densidad de ocupación de vía pública por mesas y sillas.",
    citizenHint:
      "Detecta la sustitución de comercio cotidiano de proximidad por monocultivo hostelero.",
    stops: [
      [0, "#eff6ff"],
      [25, "#93c5fd"],
      [45, "#f59e0b"],
      [65, "#d97706"],
      [85, "#78350f"],
    ],
  },
  brecha_equidad_urbana: {
    label: "Vector 3 · Brecha de Equidad Urbana y Convivencia",
    shortLabel: "Equidad y Avisos",
    weightBadge: "20%",
    unit: "/ 100",
    description:
      "Mide la densidad de avisos y quejas vecinales (FEMP Nº 11: ruido, convivencia, limpieza y desperfectos viarios) frente a la dotación de equipamientos.",
    citizenHint:
      "Refleja dónde el desgaste del espacio público y el ruido nocturno superan la capacidad de mantenimiento.",
    stops: [
      [0, "#f5f3ff"],
      [25, "#c4b5fd"],
      [45, "#a855f7"],
      [65, "#be185d"],
      [80, "#831843"],
    ],
  },
  vulnerabilidad_residencial: {
    label: "Vector 4 · Vulnerabilidad Socioeconómica Amplificada",
    shortLabel: "Vulnerabilidad Social",
    weightBadge: "20%",
    unit: "/ 100",
    description:
      "Integra el índice municipal de vulnerabilidad (económica, demográfica y de equipamientos) amplificado por la presión habitacional turística del barrio.",
    citizenHint:
      "Identifica vecindarios con menor colchón de renta o población envejecida más expuestos a expulsión residencial.",
    stops: [
      [0, "#f8fafc"],
      [25, "#94a3b8"],
      [45, "#fb923c"],
      [65, "#e11d48"],
      [80, "#4c0519"],
    ],
  },
};

interface RadarMapProps {
  geojson: GeoJSON.FeatureCollection | null;
  metric: MapMetricKey;
  onMetricChange: (m: MapMetricKey) => void;
  selectedBarrioCode: string | null;
  onSelectBarrio: (coddistbar: string) => void;
  barriosByCode: Map<string, BarrioIndicators>;
}

export function RadarMap({
  geojson,
  metric,
  onMetricChange,
  selectedBarrioCode,
  onSelectBarrio,
  barriosByCode,
}: RadarMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibreglType.Map | null>(null);
  const [shouldInitMap, setShouldInitMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<{
    nombre: string;
    distrito: string;
    coddistbar: string;
    score: number;
    vut: number;
    densidad: number;
    avisos: number;
  } | null>(null);

  const buildFillColorExpression = (
    m: MapMetricKey
  ): maplibreglType.ExpressionSpecification => {
    const stops = METRIC_CONFIG[m].stops;
    const expr: unknown[] = [
      "interpolate",
      ["linear"],
      ["coalesce", ["to-number", ["get", m]], 0],
    ];
    for (const [val, color] of stops) {
      expr.push(val, color);
    }
    return expr as maplibreglType.ExpressionSpecification;
  };

  // Lazy trigger when map wrapper enters viewport or after idle
  useEffect(() => {
    if (shouldInitMap) return;
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldInitMap(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldInitMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldInitMap]);

  useEffect(() => {
    if (!shouldInitMap || !containerRef.current) return;
    let cancelled = false;
    let instance: maplibreglType.Map | null = null;

    async function initMap() {
      const mod = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      const maplibregl = mod.default;

      instance = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [-0.3763, 39.4699],
        zoom: 12.1,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      instance.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );
      instance.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            "GVA Dades Obertes (tur-gestur-vt) & Ajuntament de València",
        }),
        "bottom-right"
      );

      instance.on("load", () => {
        if (!cancelled) {
          setMapLoaded(true);
        }
      });

      mapRef.current = instance;
    }

    initMap();

    return () => {
      cancelled = true;
      if (instance) {
        instance.remove();
      }
      mapRef.current = null;
    };
  }, [shouldInitMap]);

  // Add or update GeoJSON source and choropleth/3D layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !geojson) return;

    const existingSource = map.getSource("barrios-source") as
      | maplibreglType.GeoJSONSource
      | undefined;

    if (existingSource) {
      existingSource.setData(geojson);
    } else {
      map.addSource("barrios-source", {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: "barrios-fill",
        type: "fill",
        source: "barrios-source",
        paint: {
          "fill-color": buildFillColorExpression(metric),
          "fill-opacity": 0.76,
        },
      });

      map.addLayer({
        id: "barrios-extrusion",
        type: "fill-extrusion",
        source: "barrios-source",
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-extrusion-color": buildFillColorExpression(metric),
          "fill-extrusion-height": [
            "*",
            ["coalesce", ["to-number", ["get", metric]], 0],
            14,
          ],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.84,
        },
      });

      map.addLayer({
        id: "barrios-outline",
        type: "line",
        source: "barrios-source",
        paint: {
          "line-color": "#1e293b",
          "line-width": 1,
          "line-opacity": 0.48,
        },
      });

      map.addLayer({
        id: "barrios-selected-outline",
        type: "line",
        source: "barrios-source",
        filter: ["==", ["get", "coddistbar"], selectedBarrioCode ?? ""],
        paint: {
          "line-color": "#0f172a",
          "line-width": 3.4,
          "line-opacity": 1,
        },
      });

      const handleMove = (e: maplibreglType.MapLayerMouseEvent) => {
        const feat = e.features?.[0];
        if (!feat) return;
        map.getCanvas().style.cursor = "pointer";
        const p = feat.properties ?? {};
        setHoveredInfo({
          nombre: String(p.nombre ?? ""),
          distrito: String(p.distrito ?? ""),
          coddistbar: String(p.coddistbar ?? ""),
          score: Number(p[metric] ?? 0),
          vut: Number(p.vut_activas ?? 0),
          densidad: Number(p.densidad_vut_km2 ?? 0),
          avisos: Number(p.avisos_totales ?? 0),
        });
      };

      const handleLeave = () => {
        map.getCanvas().style.cursor = "";
        setHoveredInfo(null);
      };

      const handleClick = (e: maplibreglType.MapLayerMouseEvent) => {
        const feat = e.features?.[0];
        const code = feat?.properties?.coddistbar;
        if (code) {
          onSelectBarrio(String(code));
        }
      };

      map.on("mousemove", "barrios-fill", handleMove);
      map.on("mouseleave", "barrios-fill", handleLeave);
      map.on("click", "barrios-fill", handleClick);
      map.on("mousemove", "barrios-extrusion", handleMove);
      map.on("mouseleave", "barrios-extrusion", handleLeave);
      map.on("click", "barrios-extrusion", handleClick);
    }
  }, [mapLoaded, geojson]);

  // Update color expression when metric changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer("barrios-fill")) return;

    const colorExpr = buildFillColorExpression(metric);
    map.setPaintProperty("barrios-fill", "fill-color", colorExpr);
    if (map.getLayer("barrios-extrusion")) {
      map.setPaintProperty("barrios-extrusion", "fill-extrusion-color", colorExpr);
      map.setPaintProperty("barrios-extrusion", "fill-extrusion-height", [
        "*",
        ["coalesce", ["to-number", ["get", metric]], 0],
        14,
      ]);
    }
  }, [metric, mapLoaded]);

  // Center on selected neighborhood
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer("barrios-selected-outline")) return;

    map.setFilter("barrios-selected-outline", [
      "==",
      ["get", "coddistbar"],
      selectedBarrioCode ?? "",
    ]);

    if (selectedBarrioCode) {
      const barrio = barriosByCode.get(selectedBarrioCode);
      if (barrio && Array.isArray(barrio.centroid)) {
        map.flyTo({
          center: barrio.centroid,
          zoom: Math.max(map.getZoom(), 13.3),
          duration: 600,
          essential: true,
        });
      }
    }
  }, [selectedBarrioCode, mapLoaded, barriosByCode]);

  const toggle3DView = () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const next3D = !is3D;
    setIs3D(next3D);

    if (map.getLayer("barrios-extrusion") && map.getLayer("barrios-fill")) {
      map.setLayoutProperty(
        "barrios-extrusion",
        "visibility",
        next3D ? "visible" : "none"
      );
      map.setPaintProperty("barrios-fill", "fill-opacity", next3D ? 0.15 : 0.76);
    }
    map.easeTo({
      pitch: next3D ? 48 : 0,
      bearing: next3D ? -15 : 0,
      duration: 500,
    });
  };

  const resetCamera = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [-0.3763, 39.4699],
      zoom: 12.1,
      pitch: is3D ? 48 : 0,
      bearing: is3D ? -15 : 0,
      duration: 550,
    });
  };

  const activeConfig = METRIC_CONFIG[metric];

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
    >
      {/* Selector superior de capas cartográficas */}
      <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Layers className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <span>Capa cartográfica activa:</span>
          </div>
          <a
            href={`/metodologia#${metric}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-slate-950"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>¿Cómo se calcula esta capa?</span>
          </a>
        </div>

        <div
          className="mt-2.5 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Seleccionar indicador cartográfico"
        >
          {(Object.keys(METRIC_CONFIG) as MapMetricKey[]).map((key) => {
            const isSelected = key === metric;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onMetricChange(key)}
                aria-pressed={isSelected}
                className={`interactive-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span>{METRIC_CONFIG[key].shortLabel}</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                    isSelected
                      ? "bg-sky-500/25 text-sky-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {METRIC_CONFIG[key].weightBadge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lienzo del mapa con altura fija reservada (CLS = 0.000) */}
      <div className="relative h-[420px] w-full overflow-hidden bg-slate-100 sm:h-[490px]">
        {!mapLoaded && (
          <div
            aria-hidden="true"
            className="civic-grid-light absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-sm">
              <p className="text-xs font-bold text-slate-800">
                Cargando cartografía vectorial de los 88 barrios de València…
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                Polígonos oficiales municipales + indicadores cruzados en DuckDB
              </p>
            </div>
          </div>
        )}

        <div ref={containerRef} className="h-full w-full" />

        {/* Controles flotantes superiores izquierdos */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetCamera}
            className="interactive-btn flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-xs hover:bg-slate-50"
            title="Centrar vista en toda la ciudad de València"
          >
            <Compass className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
            <span>Vista Ciudad</span>
          </button>

          <button
            type="button"
            onClick={toggle3DView}
            aria-pressed={is3D}
            className={`interactive-btn flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-xs ${
              is3D
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white/95 text-slate-800 hover:bg-slate-50"
            }`}
            title="Alternar relieve 3D proporcional a la presión del indicador"
          >
            <Box className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{is3D ? "Volver a 2D" : "Relieve 3D"}</span>
          </button>
        </div>

        {/* Tooltip flotante al pasar el puntero (escritorio) */}
        {hoveredInfo && (
          <div className="pointer-events-none absolute top-14 left-3 z-10 max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-bold text-sky-800">
                Barrio #{hoveredInfo.coddistbar} · {hoveredInfo.distrito}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">
              {hoveredInfo.nombre}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs">
              <span className="text-slate-600">{activeConfig.shortLabel}:</span>
              <span className="font-mono font-bold text-slate-900">
                {hoveredInfo.score.toFixed(1)} {activeConfig.unit}
              </span>
              <span className="text-slate-600">VUT vigentes:</span>
              <span className="font-mono font-semibold text-slate-800">
                {hoveredInfo.vut} ({hoveredInfo.densidad}/km²)
              </span>
              <span className="text-slate-600">Avisos vecinales:</span>
              <span className="font-mono font-semibold text-slate-800">
                {hoveredInfo.avisos.toLocaleString("es-ES")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pie del mapa: Leyenda cromática accesible + explicación en lenguaje claro */}
      <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3.5">
        <div className="grid gap-3 md:grid-cols-12 md:items-center">
          <div className="space-y-1 md:col-span-7">
            <p className="text-xs font-bold text-slate-900">{activeConfig.label}</p>
            <p className="text-xs leading-relaxed text-slate-600">
              {activeConfig.description}{" "}
              <strong className="font-semibold text-slate-800">
                {activeConfig.citizenHint}
              </strong>
            </p>
          </div>

          <div className="md:col-span-5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Menor intensidad (0)</span>
              <span>Mayor presión (100)</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {activeConfig.stops.map(([val, color]) => (
                <div key={val} className="flex flex-1 flex-col items-center">
                  <span
                    className="h-3 w-full rounded-xs border border-slate-300/80"
                    style={{ backgroundColor: color }}
                  />
                  <span className="mt-1 font-mono text-[10px] font-medium text-slate-700">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
