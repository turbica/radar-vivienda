import type { APIRoute, GetStaticPaths } from "astro";
import { loadObservatoryData } from "../../lib/data";
import { slugBarrio } from "../../lib/barrios";

export const getStaticPaths: GetStaticPaths = async () => {
  const { resumen } = await loadObservatoryData();
  return resumen.allBarrios.map((b) => ({
    params: { slug: slugBarrio(b.nombre) },
    props: { barrio: b, snapshot: resumen.latestSnapshot.fileName, updatedAt: resumen.updatedAt },
  }));
};

export const GET: APIRoute = ({ props }) =>
  new Response(
    JSON.stringify(
      {
        fuente: "Radar Vivienda València (AGPL-3.0); datos de GVA Dades Obertes (CC BY) y Ayuntamiento de València",
        instantanea: props.snapshot,
        actualizado: props.updatedAt,
        barrio: props.barrio,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
