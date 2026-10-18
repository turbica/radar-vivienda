import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Compass, Layers, Box } from "lucide-react";
import type { BarrioIndicators, MapMetricKey } from "../types/observatory";

export const METRIC_CONFIG: Record<
  MapMetricKey,
  {
    label: string;
    shortLabel: string;
    unit: string;
    description: string;
    stops: Array<[number, string]>;
  }
> = {
  isvp: {
    label: "Índice Sintético de Vulnerabilidad y Presión (ISVP)",
    shortLabel: "ISVP Global",
    unit: "/ 100",
    description:
      "Combina presión de pisos turísticos (35%), desplazamiento comercial (25%), quejas vecinales de deterioro (20%) y vulnerabilidad socioeconómica (20%).",
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
    label: "Presión Residencial de Viviendas Turísticas",
    shortLabel: "Presión Turística",
    unit: "/ 100",
    description:
      "Basado en densidad de licencias VUT por km², plazas turísticas vigentes y velocidad de nuevas altas (2024–2026) en el registro GVA.",
    stops: [
      [0, "#f0fdf4"],
      [20, "#86efac"],
      [45, "#facc15"],
      [65, "#ea580c"],
      [85, "#991b1b"],
    ],
  },
  desplazamiento_comercial: {
    label: "Riesgo de Desplazamiento Comercial y Saturación de Terrazas",
    shortLabel: "Comercio y Terrazas",
    unit: "/ 100",
    description:
      "Cruza la variación de recibos del Impuesto de Actividades Económicas (IAE, FEMP Nº 20) con la densidad de ocupación de vía pública por mesas y sillas.",
    stops: [
      [0, "#eff6ff"],
      [25, "#93c5fd"],
      [45, "#f59e0b"],
      [65, "#d97706"],
      [85, "#78350f"],
    ],
  },
  brecha_equidad_urbana: {
    label: "Brecha de Equidad Urbana y Deterioro Reportado",
    shortLabel: "Equidad y Avisos",
    unit: "/ 100",
    description:
      "Mide la densidad de avisos y quejas vecinales (FEMP Nº 11: ruido, convivencia, limpieza y desperfectos viarios) frente a la dotación de equipamientos.",
    stops: [
      [0, "#f5f3ff"],
      [25, "#c4b5fd"],
      [45, "#a855f7"],
      [65, "#be185d"],
      [80, "#831843"],
    ],
  },
  vulnerabilidad_residencial: {
    label: "Vulnerabilidad Socioeconómica y Demográfica Amplificada",
    shortLabel: "Vulnerabilidad Social",
    unit: "/ 100",
    description:
      "Integra el índice municipal de vulnerabilidad (económica, demográfica y de equipamientos) amplificado por la presión habitacional turística del barrio.",
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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

  const buildFillColorExpression = (m: MapMetricKey): maplibregl.ExpressionSpecification => {
    const stops = METRIC_CONFIG[m].stops;
    const expr: unknown[] = [
      "interpolate",
      ["linear"],
      ["coalesce", ["to-number", ["get", m]], 0],
    ];
    for (const [val, color] of stops) {
      expr.push(val, color);
    }
    return expr as maplibregl.ExpressionSpecification;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-0.3763, 39.4699],
      zoom: 12.1,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          "Datos: GVA Dades Obertes (tur-gestur-vt) & Ajuntament de València Open Data",
      }),
      "bottom-right"
    );

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Añadir o actualizar fuente y capas cuando carga el mapa o el GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !geojson) return;

    const existingSource = map.getSource("barrios-source") as
      | maplibregl.GeoJSONSource
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
          "fill-opacity": 0.74,
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
          "fill-extrusion-opacity": 0.82,
        },
      });

      map.addLayer({
        id: "barrios-outline",
        type: "line",
        source: "barrios-source",
        paint: {
          "line-color": "#1e293b",
          "line-width": 1,
          "line-opacity": 0.45,
        },
      });

      map.addLayer({
        id: "barrios-selected-outline",
        type: "line",
        source: "barrios-source",
        filter: ["==", ["get", "coddistbar"], selectedBarrioCode ?? ""],
        paint: {
          "line-color": "#1e3a8a",
          "line-width": 3.2,
          "line-opacity": 1,
        },
      });

      const handleMove = (e: maplibregl.MapLayerMouseEvent) => {
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

      const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
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

  // Actualizar expresión de color cuando cambia la métrica activa
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

  // Actualizar filtro de barrio seleccionado y centrar suavemente
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
          zoom: Math.max(map.getZoom(), 13.4),
          duration: 650,
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
      map.setPaintProperty("barrios-fill", "fill-opacity", next3D ? 0.15 : 0.74);
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
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Selector de capas cartográficas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Layers className="h-4 w-4 text-blue-700" aria-hidden="true" />
          <span>Capa activa:</span>
        </div>
        <div
          className="flex flex-wrap gap-1.5"
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
                className={`interactive-btn rounded-lg px-2.5 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isSelected
                    ? "bg-blue-800 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {METRIC_CONFIG[key].shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lienzo del mapa */}
      <div className="relative h-[510px] w-full overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />

        {/* Controles flotantes superiores izquierdos */}
        <div className=" absolute top-3 left-3 z-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetCamera}
            className="interactive-btn flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm backdrop-blur-xs hover:bg-slate-50"
            title="Centrar vista en València"
          >
            <Compass className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
            <span>Centrar València</span>
          </button>

          <button
            type="button"
            onClick={toggle3DView}
            className={`interactive-btn flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-xs ${
              is3D
                ? "border-blue-800 bg-blue-800 text-white"
                : "border-slate-300 bg-white/95 text-slate-800 hover:bg-slate-50"
            }`}
            title="Alternar extrusión 3D por intensidad del indicador"
          >
            <Box className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{is3D ? "Vista 2D" : "Extrusión 3D"}</span>
          </button>
        </div>

        {/* Tooltip flotante en hover */}
        {hoveredInfo && (
          <div className="pointer-events-none absolute top-14 left-3 z-10 max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-semibold text-blue-800">
                #{hoveredInfo.coddistbar} · {hoveredInfo.distrito}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {hoveredInfo.nombre}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs">
              <span className="text-slate-500">{activeConfig.shortLabel}:</span>
              <span className="font-mono font-bold text-slate-900">
                {hoveredInfo.score.toFixed(1)} {activeConfig.unit}
              </span>
              <span className="text-slate-500">VUT vigentes:</span>
              <span className="font-mono font-semibold text-slate-800">
                {hoveredInfo.vut} ({hoveredInfo.densidad}/km²)
              </span>
              <span className="text-slate-500">Avisos vecinales:</span>
              <span className="font-mono font-semibold text-slate-800">
                {hoveredInfo.avisos.toLocaleString("es-ES")}
              </span>
            </div>
          </div>
        )}

        {/* Leyenda inferior izquierda */}
        <div className="absolute bottom-3 left-3 z-10 max-w-sm rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-sm backdrop-blur-xs">
          <p className="text-xs font-semibold text-slate-900">{activeConfig.label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
            {activeConfig.description}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {activeConfig.stops.map(([val, color]) => (
              <div key={val} className="flex flex-1 flex-col items-center">
                <span
                  className="h-2.5 w-full rounded-xs border border-slate-300/60"
                  style={{ backgroundColor: color }}
                />
                <span className="mt-0.5 font-mono text-[10px] text-slate-600">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
