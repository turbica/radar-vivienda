import type { APIRoute } from "astro";
import { loadObservatoryData } from "../lib/data";
import { slugBarrio } from "../lib/barrios";

const SECCIONES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/barrios", changefreq: "weekly", priority: "0.9" },
  { path: "/evolucion", changefreq: "weekly", priority: "0.9" },
  { path: "/metodologia", changefreq: "monthly", priority: "0.8" },
  { path: "/datos", changefreq: "weekly", priority: "0.8" },
];

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.toString() ?? "https://radar-vivienda.valencia.es/").replace(/\/+$/, "");
  const { resumen } = await loadObservatoryData();
  const lastmod = resumen.updatedAt.slice(0, 10);

  const urls = [
    ...SECCIONES,
    ...resumen.allBarrios.map((b) => ({
      path: `/barrios/${slugBarrio(b.nombre)}`,
      changefreq: "weekly",
      priority: "0.7",
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${origin}${u.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
