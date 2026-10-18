import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Esquema de validación para `config/fuentes.json` (única fuente de verdad de URLs y datasets).
 */
export const FuentesSchema = z.object({
  gva_viviendas_turisticas_csv: z.string().url(),
  gva_viviendas_turisticas_dataset_id: z.string().min(1),
  gva_ckan_api: z.string().url(),
  valencia_ckan_portal: z.string().url(),
  valencia_ckan_api: z.string().url(),
  datasets_municipales_femp80: z.array(z.string().min(1)).nonempty(),
  valencia_datasets: z.object({
    barrios: z.object({
      package_id: z.string(),
      geojson_url: z.string().url(),
      pbf_url: z.string().url(),
    }),
    distritos: z.object({
      package_id: z.string(),
      geojson_url: z.string().url(),
    }),
    vulnerabilidad_barrios: z.object({
      package_id: z.string(),
      geojson_url: z.string().url(),
      csv_url: z.string().url(),
    }),
    femp11_avisos_quejas: z.object({
      femp_code: z.string(),
      femp_title: z.string(),
      package_id: z.string(),
      csv_url: z.string().url(),
    }),
    femp12_ayudas_subvenciones: z.object({
      femp_code: z.string(),
      femp_title: z.string(),
      package_id: z.string(),
      csv_url: z.string().url(),
    }),
    femp20_censo_actividades_iae: z.object({
      femp_code: z.string(),
      femp_title: z.string(),
      package_id: z.string(),
      csv_url: z.string().url(),
      terrazas_package_id: z.string(),
      terrazas_csv_url: z.string().url(),
    }),
    femp40_facturas_presupuesto: z.object({
      femp_code: z.string(),
      femp_title: z.string(),
      package_id: z.string(),
      csv_url: z.string().url(),
      caja_fija_package_id: z.string(),
      caja_fija_csv_url: z.string().url(),
    }),
  }),
  oficina_estadistica_valencia: z.object({
    web: z.string().url(),
    email_solicitudes: z.string().email(),
  }),
  canales_gobernanza: z.object({
    solicitud_datos_ayuntamiento: z.string().url(),
    casos_uso_ayuntamiento: z.string().url(),
    premios_datos_abiertos: z.string().url(),
    las_naves_email: z.string().email(),
    upv_dades_valencia: z.string().url(),
  }),
  gva_viviendas_turisticas_ficha: z.string().url().optional(),
  valencia_estadistica_sede: z.string().url().optional(),
  guia_femp_80_datasets_pdf: z.string().url().optional(),
});

export type FuentesConfig = z.infer<typeof FuentesSchema>;

export async function loadFuentesConfig(): Promise<FuentesConfig> {
  const configPath = path.join(REPO_ROOT, "config", "fuentes.json");
  const rawContent = await readFile(configPath, "utf-8");
  return FuentesSchema.parse(JSON.parse(rawContent));
}

export function getDataDirs() {
  const baseDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(REPO_ROOT, "data");
  return {
    baseDir,
    rawDir: path.join(baseDir, "raw"),
    processedDir: path.join(baseDir, "processed"),
    webPublicDataDir: path.join(REPO_ROOT, "web", "public", "data", "processed"),
  };
}
