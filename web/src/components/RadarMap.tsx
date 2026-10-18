import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

/**
 * Isla interactiva React 19 + MapLibre GL JS (coste 0 € con teselas vectoriales libres de OpenFreeMap).
 * Preparada para superponer capas GeoJSON/PBF de vulnerabilidad barrial y presión turística en València.
 */
export function RadarMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-0.3763, 39.4699], // València
      zoom: 12.2,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
