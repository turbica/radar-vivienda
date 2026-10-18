import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { NIVEL_COLOR, normalizarBusqueda, type BarrioBusqueda } from "../lib/barrios";

interface BarrioSearchProps {
  barrios: BarrioBusqueda[];
  /** Slugs que se muestran como accesos rápidos bajo el buscador. */
  destacados?: string[];
  destacadosLabel?: string;
  /** "dark" para colocarlo sobre fondo de tinta. */
  tone?: "light" | "dark";
}

const MAX_SUGERENCIAS = 7;

export function BarrioSearch({
  barrios,
  destacados = [],
  destacadosLabel = "Por ejemplo:",
  tone = "light",
}: BarrioSearchProps) {
  const id = useId();
  const listId = `${id}-lista`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);

  const indexados = useMemo(
    () =>
      barrios.map((b) => ({
        ...b,
        clave: normalizarBusqueda(b.nombre),
        claveDistrito: normalizarBusqueda(b.distrito),
      })),
    [barrios]
  );

  const sugerencias = useMemo(() => {
    const q = normalizarBusqueda(query);
    if (!q) return [];
    const empieza = indexados.filter((b) => b.clave.startsWith(q));
    const contiene = indexados.filter(
      (b) => !b.clave.startsWith(q) && (b.clave.includes(q) || b.claveDistrito.includes(q))
    );
    return [...empieza, ...contiene].slice(0, MAX_SUGERENCIAS);
  }, [query, indexados]);

  const accesos = destacados
    .map((slug) => barrios.find((b) => b.slug === slug))
    .filter((b): b is BarrioBusqueda => Boolean(b));

  const ir = (slug: string) => {
    window.location.href = `/barrios/${slug}`;
  };

  const onSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const elegido = sugerencias[active] ?? sugerencias[0];
    if (elegido) {
      ir(elegido.slug);
    } else {
      setError(true);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!sugerencias.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const dark = tone === "dark";
  const showList = open && sugerencias.length > 0;

  return (
    <div className="w-full max-w-[760px]">
      <form
        role="search"
        action="/barrios"
        method="get"
        onSubmit={onSubmit}
        className="relative flex flex-wrap gap-3"
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          Escribe el nombre de tu barrio
        </label>
        <div className="relative min-w-0 flex-[1_1_320px]">
          <input
            id={`${id}-q`}
            type="text"
            name="q"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${id}-op-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Escribe tu barrio: Russafa, Benimaclet…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
              setError(false);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            className="h-[60px] w-full border-2 border-ink bg-paper-2 px-5 text-[19px] text-ink placeholder:text-muted"
          />
          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Barrios que coinciden"
              className="absolute top-full right-0 left-0 z-30 mt-1 border-2 border-ink bg-paper-2 shadow-[6px_6px_0_0_#141414]"
            >
              {sugerencias.map((b, i) => (
                <li
                  key={b.slug}
                  id={`${id}-op-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    ir(b.slug);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center justify-between gap-4 border-b border-ink/15 px-5 py-3 text-ink last:border-b-0 ${
                    i === active ? "bg-mark" : ""
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-bold">{b.nombre}</span>
                    <span className="text-sm text-muted">{b.distrito}</span>
                  </span>
                  <span className="flex items-center gap-2 font-mono text-sm">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full border border-ink"
                      style={{ backgroundColor: NIVEL_COLOR[b.nivel] }}
                    />
                    {b.isvp.toLocaleString("es-ES", { minimumFractionDigits: 1 })}
                    <span className="sr-only">puntos, nivel {b.nivel}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="btn h-[60px] border-ink bg-mark px-7 text-[19px] text-ink hover:bg-[#ffe14d]"
        >
          Ver mi barrio
        </button>
      </form>

      <p aria-live="polite" className={`mt-2 min-h-[1.5em] text-[15px] ${dark ? "text-paper" : "text-ink"}`}>
        {error ? "No encontramos ese barrio. Prueba con otro nombre o con tu distrito." : ""}
      </p>

      {accesos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[15px]">
          <span className={dark ? "text-paper/80" : "text-muted"}>{destacadosLabel}</span>
          {accesos.map((b) => (
            <a
              key={b.slug}
              href={`/barrios/${b.slug}`}
              className={`border px-3.5 py-2 no-underline ${
                dark
                  ? "border-paper/50 text-paper hover:bg-paper hover:text-ink"
                  : "border-ink text-ink hover:bg-ink hover:text-paper"
              }`}
            >
              {b.nombre}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
