import { CkanClient, type SnapshotSaveResult } from "@turbica/valencia-open-data-core";
import { loadFuentesConfig, type FuentesConfig } from "../config.ts";
import { createSnapshotManager } from "../storage.ts";

const USER_AGENT =
  "radar-vivienda-observatorio/0.1.0 (+https://github.com/turbica/radar-vivienda)";

export interface CollectionRunSummary {
  capturedAt: string;
  results: Record<string, { savedNewFile: boolean; fileName: string; bytes: number; sha256: string }>;
}

async function captureWithMetadata(params: {
  ckan?: CkanClient;
  packageId?: string;
  category: string;
  datasetId: string;
  extension: string;
  fallbackUrl: string;
  formatFilter?: string[];
  publisher: string;
}): Promise<SnapshotSaveResult> {
  const snapshots = createSnapshotManager();
  let sourceUrl = params.fallbackUrl;
  let license: string | null = null;
  let lastModified: string | null = null;

  if (params.ckan && params.packageId) {
    try {
      const pkg = await params.ckan.packageShow(params.packageId);
      license = pkg.license_title ?? pkg.license_id ?? null;
      lastModified = pkg.metadata_modified ?? null;

      if (params.formatFilter && params.formatFilter.length > 0) {
        const matched = params.ckan.filterResourcesByFormat(pkg, params.formatFilter)[0];
        if (matched) {
          sourceUrl = matched.url || sourceUrl;
          lastModified = matched.last_modified ?? lastModified;
        }
      }
    } catch (err) {
      console.warn(
        `[collector] Aviso al consultar CKAN (${params.packageId}), usando URL configurada en fuentes.json:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`[collector] Capturando ${params.category}/${params.datasetId}...`);
  const res = await snapshots.downloadAndSave({
    category: params.category,
    datasetId: params.datasetId,
    extension: params.extension,
    sourceUrl,
    lastModified,
    license,
    publisher: params.publisher,
    timeoutMs: 90_000,
  });

  const statusLabel = res.savedNewFile ? "NUEVA INSTANTÁNEA" : "SIN CAMBIOS (SHA-256 idéntico)";
  console.log(
    `[collector] -> ${statusLabel}: ${res.metadata.relativePath} (${(res.metadata.bytes / 1024).toFixed(1)} KB)`
  );
  return res;
}

/**
 * Ejecuta la ingesta completa de todas las fuentes definidas en `config/fuentes.json`:
 * 1. Si `STORAGE_DRIVER=gcs`, hidrata primero `data/raw/` desde Google Cloud Storage.
 * 2. Captura el CSV vivo de viviendas turísticas de la GVA (`tur-gestur-vt`).
 * 3. Captura la cartografía oficial de Barrios y Distritos del Ayuntamiento de València.
 * 4. Captura el índice municipal de vulnerabilidad por barrios y los datasets FEMP 80 (Avisos/Quejas Nº 11, Ayudas/Subvenciones Nº 12, Censo IAE y Terrazas Nº 20, Presupuesto/Facturas Nº 40).
 */
export async function runAllCollectors(
  customFuentes?: FuentesConfig
): Promise<CollectionRunSummary> {
  const fuentes = customFuentes ?? (await loadFuentesConfig());
  const snapshots = createSnapshotManager();

  // Si estamos en entorno Cloud (GCS), hidratar instantáneas previas antes de capturar
  const categories = [
    "gva-viviendas-turisticas",
    "valencia-cartografia",
    "valencia-estadistica",
    "valencia-femp80",
  ];
  for (const cat of categories) {
    const hydrated = await snapshots.hydrateCategoryFromMirror(cat);
    if (hydrated > 0) {
      console.log(`[collector] Hidratadas ${hydrated} instantáneas remotas en ${cat}.`);
    }
  }

  const gvaCkan = new CkanClient({
    baseUrl: fuentes.gva_ckan_api,
    userAgent: USER_AGENT,
  });

  const vlcCkan = new CkanClient({
    baseUrl: fuentes.valencia_ckan_api,
    userAgent: USER_AGENT,
  });

  const vds = fuentes.valencia_datasets;
  const results: CollectionRunSummary["results"] = {};

  const record = (key: string, r: SnapshotSaveResult) => {
    results[key] = {
      savedNewFile: r.savedNewFile,
      fileName: r.metadata.fileName,
      bytes: r.metadata.bytes,
      sha256: r.metadata.sha256,
    };
  };

  // 1. GVA Viviendas Turísticas (CSV vivo tur-gestur-vt)
  record(
    "gva_viviendas_turisticas",
    await captureWithMetadata({
      ckan: gvaCkan,
      packageId: fuentes.gva_viviendas_turisticas_dataset_id,
      category: "gva-viviendas-turisticas",
      datasetId: fuentes.gva_viviendas_turisticas_dataset_id,
      extension: "csv",
      fallbackUrl: fuentes.gva_viviendas_turisticas_csv,
      formatFilter: ["CSV"],
      publisher: "Generalitat Valenciana - Dades Obertes",
    })
  );

  // 2. Cartografía oficial de Barrios y Distritos (Geoportal / CKAN València)
  record(
    "valencia_barrios_geojson",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.barrios.package_id,
      category: "valencia-cartografia",
      datasetId: vds.barrios.package_id,
      extension: "geojson",
      fallbackUrl: vds.barrios.geojson_url,
      formatFilter: ["GeoJSON"],
      publisher: "Ayuntamiento de València - Geoportal",
    })
  );

  record(
    "valencia_distritos_geojson",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.distritos.package_id,
      category: "valencia-cartografia",
      datasetId: vds.distritos.package_id,
      extension: "geojson",
      fallbackUrl: vds.distritos.geojson_url,
      formatFilter: ["GeoJSON"],
      publisher: "Ayuntamiento de València - Geoportal",
    })
  );

  // 3. Vulnerabilidad municipal por barrios (Estadística / Open Data València)
  record(
    "valencia_vulnerabilidad_barrios",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.vulnerabilidad_barrios.package_id,
      category: "valencia-estadistica",
      datasetId: vds.vulnerabilidad_barrios.package_id,
      extension: "csv",
      fallbackUrl: vds.vulnerabilidad_barrios.csv_url,
      formatFilter: ["CSV"],
      publisher: "Ayuntamiento de València - Oficina de Estadística",
    })
  );

  // 4. Datasets Municipales FEMP 80 (Nº 11, Nº 12, Nº 20, Nº 40)
  record(
    "femp11_avisos_quejas",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.femp11_avisos_quejas.package_id,
      category: "valencia-femp80",
      datasetId: "femp11-quejas-sugerencias",
      extension: "csv",
      fallbackUrl: vds.femp11_avisos_quejas.csv_url,
      formatFilter: ["CSV"],
      publisher: "Ayuntamiento de València - Open Data",
    })
  );

  record(
    "femp12_ayudas_subvenciones",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.femp12_ayudas_subvenciones.package_id,
      category: "valencia-femp80",
      datasetId: "femp12-subvenciones-nominativas",
      extension: "csv",
      fallbackUrl: vds.femp12_ayudas_subvenciones.csv_url,
      formatFilter: ["CSV"],
      publisher: "Ayuntamiento de València - Open Data",
    })
  );

  record(
    "femp20_censo_iae",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.femp20_censo_actividades_iae.package_id,
      category: "valencia-femp80",
      datasetId: "femp20-recibos-iae",
      extension: "csv",
      fallbackUrl: vds.femp20_censo_actividades_iae.csv_url,
      formatFilter: ["CSV"],
      publisher: "Ayuntamiento de València - Open Data",
    })
  );

  record(
    "femp20_terrazas_hosteleria",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.femp20_censo_actividades_iae.terrazas_package_id,
      category: "valencia-femp80",
      datasetId: "femp20-recibos-mesas-sillas",
      extension: "csv",
      fallbackUrl: vds.femp20_censo_actividades_iae.terrazas_csv_url,
      formatFilter: ["CSV"],
      publisher: "Ayuntamiento de València - Open Data",
    })
  );

  record(
    "femp40_presupuesto_gastos",
    await captureWithMetadata({
      ckan: vlcCkan,
      packageId: vds.femp40_facturas_presupuesto.package_id,
      category: "valencia-femp80",
      datasetId: "femp40-presupuesto-gastos",
      extension: "csv",
      fallbackUrl: vds.femp40_facturas_presupuesto.csv_url,
      formatFilter: ["CSV"],
      publisher: "Ayuntamiento de València - Open Data",
    })
  );

  return {
    capturedAt: new Date().toISOString(),
    results,
  };
}
