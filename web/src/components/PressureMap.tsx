import { useEffect, useRef, useState } from "react";
import type maplibreglType from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { NIVEL_COLOR, NIVEL_UMBRAL, slugBarrio, nombreLegible } from "../lib/barrios";

interface PressureMapProps {
  geojsonUrl: string;
  /** Barrio resaltado (coddistbar), p. ej. en su ficha. */
  highlight?: string;
  /** Altura relativa del mapa (ancho / alto). */
  aspect?: string;
  interactive?: boolean;
}

interface HoverInfo {
  nombre: string;
  distrito: string;
  isvp: number;
  nivel: string;
  vut: number;
}

const CENTRO: [number, number] = [-0.3763, 39.4699];

const fillColor: maplibreglType.ExpressionSpecification = [
  "step",
  ["coalesce", ["to-number", ["get", "isvp"]], 0],
  NIVEL_COLOR.Baja,
  NIVEL_UMBRAL.Moderada,
  NIVEL_COLOR.Moderada,
  NIVEL_UMBRAL.Alta,
  NIVEL_COLOR.Alta,
  NIVEL_UMBRAL.Crítica,
  NIVEL_COLOR.Crítica,
];

export function PressureMap({
  geojsonUrl,
  highlight,
  aspect = "965 / 800",
  interactive = true,
}: PressureMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Carga diferida: MapLibre solo se descarga cuando el mapa entra en pantalla
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current) return;
    let cancelled = false;
    let map: maplibreglType.Map | null = null;

    (async () => {
      try {
        const [{ default: maplibregl }, geojson] = await Promise.all([
          import("maplibre-gl"),
          fetch(geojsonUrl).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<GeoJSON.FeatureCollection>;
          }),
        ]);
        if (cancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: CENTRO,
          zoom: 11.6,
          attributionControl: false,
          interactive,
          cooperativeGestures: interactive,
        });
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: "GVA Dades Obertes · Ajuntament de València",
          }),
          "bottom-right"
        );
        if (interactive) {
          map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        }

        map.on("load", () => {
          if (!map || cancelled) return;
          map.addSource("barrios", { type: "geojson", data: geojson });
          map.addLayer({
            id: "barrios-fill",
            type: "fill",
            source: "barrios",
            paint: { "fill-color": fillColor, "fill-opacity": 0.86 },
          });
          map.addLayer({
            id: "barrios-line",
            type: "line",
            source: "barrios",
            paint: { "line-color": "#141414", "line-width": 0.8, "line-opacity": 0.7 },
          });
          map.addLayer({
            id: "barrios-highlight",
            type: "line",
            source: "barrios",
            filter: ["==", ["get", "coddistbar"], highlight ?? ""],
            paint: { "line-color": "#141414", "line-width": 4 },
          });

          if (highlight) {
            const feat = geojson.features.find((f) => f.properties?.coddistbar === highlight);
            const c = feat?.properties?.centroid as [number, number] | undefined;
            if (c) map.jumpTo({ center: c, zoom: 13.4 });
          }

          if (interactive) {
            map.on("mousemove", "barrios-fill", (e) => {
              const p = e.features?.[0]?.properties;
              if (!p || !map) return;
              map.getCanvas().style.cursor = "pointer";
              setHover({
                nombre: nombreLegible(String(p.nombre)),
                distrito: String(p.distrito),
                isvp: Number(p.isvp),
                nivel: String(p.nivel_alerta),
                vut: Number(p.vut_activas),
              });
            });
            map.on("mouseleave", "barrios-fill", () => {
              if (map) map.getCanvas().style.cursor = "";
              setHover(null);
            });
            map.on("click", "barrios-fill", (e) => {
              const nombre = e.features?.[0]?.properties?.nombre;
              if (nombre) window.location.href = `/barrios/${slugBarrio(String(nombre))}`;
            });
          }
          // La atribución compacta arranca desplegada y tapa el mapa en móvil
          containerRef.current
            ?.querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
          setLoaded(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [visible, geojsonUrl, highlight, interactive]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden border border-ink bg-paper-2"
      style={{ aspectRatio: aspect }}
    >
      <div
        ref={containerRef}
        // h-full y no absolute: maplibre-gl.css fuerza position: relative en .maplibregl-map
        className="h-full w-full"
        role="region"
        aria-label="Mapa de los barrios de València coloreados por nivel de presión. La misma información está en la lista de barrios."
      />
      {!loaded && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-mono text-sm text-muted">
          {failed ? "No se ha podido cargar el mapa. Consulta la lista de barrios." : "Cargando mapa de barrios…"}
        </p>
      )}
      {hover && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 min-w-[220px] border-2 border-ink bg-paper-2 p-3 shadow-[4px_4px_0_0_#141414]">
          <p className="font-display text-lg leading-tight font-extrabold">{hover.nombre}</p>
          <p className="text-sm text-muted">{hover.distrito}</p>
          <p className="mt-2 flex items-baseline justify-between gap-4 font-mono text-sm">
            <span>
              ISVP <strong className="text-base">{hover.isvp.toLocaleString("es-ES")}</strong>
            </span>
            <span>{hover.vut} VUT</span>
          </p>
          <p className="mt-1 text-sm font-bold">Nivel {hover.nivel.toLowerCase()} · clic para abrir</p>
        </div>
      )}
    </div>
  );
}
