import type { BarrioIndicators } from "../types/observatory";

export type NivelAlerta = BarrioIndicators["nivel_alerta"];

/** Colores del boletín por nivel (mismos valores que los tokens --color-nivel-* de global.css). */
export const NIVEL_COLOR: Record<NivelAlerta, string> = {
  Crítica: "#7a1f12",
  Alta: "#e0662a",
  Moderada: "#f2b84b",
  Baja: "#e4ded0",
};

export const NIVEL_ORDEN: NivelAlerta[] = ["Crítica", "Alta", "Moderada", "Baja"];

/** Tramos del ISVP (inicio de cada nivel) para la regla 0–100. */
export const NIVEL_UMBRAL: Record<NivelAlerta, number> = {
  Baja: 0,
  Moderada: 32,
  Alta: 46,
  Crítica: 62,
};

const PALABRAS_MINUSCULA = new Set(["de", "del", "dels", "la", "les", "i", "y"]);

/** "L'ILLA PERDUDA" → "L'Illa Perduda"; "CAMI DE VERA" → "Cami de Vera". */
export function nombreLegible(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part, i) => {
      if (i > 0 && PALABRAS_MINUSCULA.has(part)) return part;
      return part.replace(/^(l'|d'|n')?(\p{L})/u, (_m, pre: string | undefined, c: string) =>
        (pre ? pre.charAt(0).toUpperCase() + pre.slice(1) : "") + c.toUpperCase()
      );
    })
    .join("");
}

/** Slug estable para URLs: "L'ILLA PERDUDA" → "l-illa-perduda". */
export function slugBarrio(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Texto normalizado para búsquedas sin tildes ni mayúsculas. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function fmtNum(value: number, decimals = 0): string {
  // "always": es-ES no agrupa por defecto los números de 4 cifras (5708 → 5.708)
  return value.toLocaleString("es-ES", {
    useGrouping: "always",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(value: number): string {
  return `${value > 0 ? "+" : ""}${fmtNum(value, 1)} %`;
}

export interface BarrioBusqueda {
  slug: string;
  nombre: string;
  distrito: string;
  isvp: number;
  nivel: NivelAlerta;
}

export function toBusqueda(barrios: BarrioIndicators[]): BarrioBusqueda[] {
  return barrios
    .map((b) => ({
      slug: slugBarrio(b.nombre),
      nombre: nombreLegible(b.nombre),
      distrito: b.distrito,
      isvp: b.isvp,
      nivel: b.nivel_alerta,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function rankingIsvp(barrios: BarrioIndicators[]): BarrioIndicators[] {
  return [...barrios].sort((a, b) => b.isvp - a.isvp);
}

/** Barrios más cercanos por distancia entre centroides (aprox. equirectangular). */
export function barriosVecinos(
  barrio: BarrioIndicators,
  barrios: BarrioIndicators[],
  n = 5
): BarrioIndicators[] {
  const [lon0, lat0] = barrio.centroid;
  const k = Math.cos((lat0 * Math.PI) / 180);
  return barrios
    .filter((b) => b.coddistbar !== barrio.coddistbar)
    .map((b) => {
      const dx = (b.centroid[0] - lon0) * k;
      const dy = b.centroid[1] - lat0;
      return { b, d: dx * dx + dy * dy };
    })
    .sort((x, y) => x.d - y.d)
    .slice(0, n)
    .map((x) => x.b);
}
