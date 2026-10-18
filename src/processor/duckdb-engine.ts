import { readFile } from "node:fs/promises";
import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { area as turfArea, centroid as turfCentroid } from "@turf/turf";
import { normalizeCodDistBar } from "@turbica/valencia-open-data-core";
import { getDataDirs, loadFuentesConfig } from "../config.ts";
import { createSnapshotManager, saveProcessedOutput } from "../storage.ts";
import { DISTRITO_NAMES, POSTAL_CODE_TO_BARRIOS } from "./postal-barrio-map.ts";

export interface BarrioIndicators {
  coddistbar: string;
  coddistrit: string;
  codbarrio: string;
  nombre: string;
  distrito: string;
  area_km2: number;
  centroid: [number, number];
  vut_activas: number;
  plazas_vut: number;
  vut_altas_recientes: number;
  densidad_vut_km2: number;
  recibos_iae: number;
  variacion_iae_pct: number;
  recibos_terrazas: number;
  importe_terrazas_eur: number;
  avisos_totales: number;
  avisos_ruido_convivencia: number;
  avisos_deterioro_viario: number;
  ind_vulnerabilidad_municipal: number;
  etiqueta_vulnerabilidad_municipal: string;
  presion_turistica: number;
  desplazamiento_comercial: number;
  brecha_equidad_urbana: number;
  vulnerabilidad_residencial: number;
  isvp: number;
  nivel_alerta: "Crítica" | "Alta" | "Moderada" | "Baja";
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

function sqlPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/'/g, "''");
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Ejecuta el motor analítico DuckDB + Turf.js sobre las instantáneas almacenadas en `data/raw/`
 * y exporta todos los artefactos a `data/processed/` (y GCS / `web/public/data/processed/`).
 */
export async function runAnalyticalProcessor() {
  const fuentes = await loadFuentesConfig();
  const snapshots = createSnapshotManager();
  const { rawDir, processedDir } = getDataDirs();

  const db = await DuckDBInstance.create(":memory:");
  const conn = await db.connect();

  // ============================================================================
  // 1. Análisis Longitudinal y Diferencial de Viviendas Turísticas GVA (DuckDB)
  // ============================================================================
  const gvaSnapshots = await snapshots.listSnapshots(
    "gva-viviendas-turisticas",
    fuentes.gva_viviendas_turisticas_dataset_id
  );

  if (gvaSnapshots.length === 0) {
    throw new Error(
      "No existen instantáneas de viviendas turísticas en data/raw/gva-viviendas-turisticas/. Ejecuta 'pnpm collect' primero."
    );
  }

  const latestGvaMeta = gvaSnapshots.at(-1)!;
  const latestGvaPath = path.join(
    rawDir,
    "gva-viviendas-turisticas",
    latestGvaMeta.fileName
  );

  console.log(
    `[duckdb] Analizando última instantánea GVA: ${latestGvaMeta.fileName} (${gvaSnapshots.length} instantáneas en histórico)...`
  );

  await conn.run(`
    CREATE OR REPLACE TABLE gva_raw AS
    SELECT *
    FROM read_csv('${sqlPath(latestGvaPath)}',
      delim=';',
      header=true,
      all_varchar=true,
      ignore_errors=true
    );
  `);

  await conn.run(`
    CREATE OR REPLACE TABLE vut_valencia AS
    SELECT
      TRIM(COALESCE(signatura, '')) AS signatura,
      LPAD(REGEXP_REPLACE(TRIM(COALESCE(cp, '')), '[^0-9]', '', 'g'), 5, '0') AS cp,
      TRIM(COALESCE(direccion, '')) AS direccion,
      TRIM(COALESCE(municipio, '')) AS municipio,
      TRIM(COALESCE(fecha_alta, '')) AS fecha_alta_str,
      TRY_STRPTIME(TRIM(COALESCE(fecha_alta, '')), '%d/%m/%Y') AS fecha_alta_dt,
      COALESCE(TRY_CAST(plazas_totales AS INTEGER), 0) AS plazas_totales,
      COALESCE(TRY_CAST(dormit_totales AS INTEGER), 0) AS dormit_totales,
      COALESCE(TRY_CAST(REPLACE(superficie, ',', '.') AS DOUBLE), 0.0) AS superficie,
      TRIM(COALESCE(ref_catastral, '')) AS ref_catastral
    FROM gva_raw
    WHERE TRIM(COALESCE(cod_provincia, '')) = '46'
      AND (
        TRIM(COALESCE(cod_municipio, '')) = '250'
        OR UPPER(TRIM(COALESCE(municipio, ''))) IN ('VALÈNCIA', 'VALENCIA')
      )
      AND TRIM(COALESCE(signatura, '')) <> '';
  `);

  // Exportar Parquet limpio de València desde DuckDB
  const parquetTempPath = path.join(
    processedDir,
    "viviendas_turisticas_valencia.parquet"
  );
  await conn.run(`
    COPY vut_valencia TO '${sqlPath(parquetTempPath)}' (FORMAT PARQUET, COMPRESSION ZSTD);
  `);
  const parquetBuffer = await readFile(parquetTempPath);
  await saveProcessedOutput({
    fileName: "viviendas_turisticas_valencia.parquet",
    content: parquetBuffer,
    contentType: "application/vnd.apache.parquet",
  });

  // Totales autonómicos y municipales
  const totalsReader = await conn.runAndReadAll(`
    SELECT
      (SELECT COUNT(*) FROM gva_raw WHERE TRIM(COALESCE(signatura, '')) <> '') AS total_cv,
      (SELECT COUNT(*) FROM vut_valencia) AS total_valencia,
      (SELECT COALESCE(SUM(plazas_totales), 0) FROM vut_valencia) AS plazas_valencia,
      (SELECT COUNT(*) FROM vut_valencia WHERE EXTRACT(YEAR FROM fecha_alta_dt) >= 2024) AS altas_2024_2026
  `);
  const totalsRow = totalsReader.getRowObjects()[0] ?? {};
  const totalVutComunitat = toNumber(totalsRow.total_cv);
  const totalVutValencia = toNumber(totalsRow.total_valencia);
  const totalPlazasValencia = toNumber(totalsRow.plazas_valencia);
  const altas2024a2026Valencia = toNumber(totalsRow.altas_2024_2026);

  // Distribución por código postal en València
  const cpReader = await conn.runAndReadAll(`
    SELECT
      cp,
      COUNT(*) AS vut_activas,
      COALESCE(SUM(plazas_totales), 0) AS plazas_vut,
      COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM fecha_alta_dt) >= 2024) AS altas_recientes,
      ROUND(AVG(NULLIF(superficie, 0)), 1) AS superficie_media
    FROM vut_valencia
    WHERE cp LIKE '460%'
    GROUP BY cp
    ORDER BY vut_activas DESC
  `);

  const cpStatsMap = new Map<
    string,
    {
      cp: string;
      vut_activas: number;
      plazas_vut: number;
      altas_recientes: number;
      superficie_media: number;
    }
  >();

  for (const row of cpReader.getRowObjects()) {
    const cp = String(row.cp ?? "");
    if (!cp) continue;
    cpStatsMap.set(cp, {
      cp,
      vut_activas: toNumber(row.vut_activas),
      plazas_vut: toNumber(row.plazas_vut),
      altas_recientes: toNumber(row.altas_recientes),
      superficie_media: toNumber(row.superficie_media),
    });
  }

  // Evolución histórica anual por fecha_alta oficial en el registro GVA
  const annualReader = await conn.runAndReadAll(`
    SELECT
      CAST(EXTRACT(YEAR FROM fecha_alta_dt) AS INTEGER) AS anio,
      COUNT(*) AS nuevas_licencias,
      COALESCE(SUM(plazas_totales), 0) AS nuevas_plazas
    FROM vut_valencia
    WHERE fecha_alta_dt IS NOT NULL
      AND EXTRACT(YEAR FROM fecha_alta_dt) BETWEEN 2015 AND 2026
    GROUP BY anio
    ORDER BY anio ASC
  `);

  let acumuladoVut = 0;
  let acumuladoPlazas = 0;
  const serieAnualAltas = annualReader.getRowObjects().map((r) => {
    const nuevas = toNumber(r.nuevas_licencias);
    const plazas = toNumber(r.nuevas_plazas);
    acumuladoVut += nuevas;
    acumuladoPlazas += plazas;
    return {
      anio: toNumber(r.anio),
      nuevas_licencias: nuevas,
      nuevas_plazas: plazas,
      stock_acumulado_vigente: acumuladoVut,
      plazas_acumuladas_vigentes: acumuladoPlazas,
    };
  });

  // ============================================================================
  // 2. Comparación Diferencial entre Instantáneas Semanales (`snapshots_diff`)
  // ============================================================================
  const snapshotsDiff: Array<{
    snapshotFile: string;
    capturedAt: string;
    sha256: string;
    vutActivasValencia: number;
    plazasValencia: number;
    altasRespectoAnterior: number;
    bajasRespectoAnterior: number;
    variacionNeta: number;
  }> = [];

  for (let i = 0; i < gvaSnapshots.length; i++) {
    const snap = gvaSnapshots[i]!;
    const snapPath = path.join(rawDir, "gva-viviendas-turisticas", snap.fileName);
    const tableCurr = `snap_${i}`;

    await conn.run(`
      CREATE OR REPLACE TABLE ${tableCurr} AS
      SELECT DISTINCT
        TRIM(COALESCE(signatura, '')) AS signatura,
        COALESCE(TRY_CAST(plazas_totales AS INTEGER), 0) AS plazas_totales
      FROM read_csv('${sqlPath(snapPath)}',
        delim=';',
        header=true,
        all_varchar=true,
        ignore_errors=true
      )
      WHERE TRIM(COALESCE(cod_provincia, '')) = '46'
        AND (
          TRIM(COALESCE(cod_municipio, '')) = '250'
          OR UPPER(TRIM(COALESCE(municipio, ''))) IN ('VALÈNCIA', 'VALENCIA')
        )
        AND TRIM(COALESCE(signatura, '')) <> '';
    `);

    const countReader = await conn.runAndReadAll(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(plazas_totales), 0) AS plz FROM ${tableCurr}
    `);
    const countRow = countReader.getRowObjects()[0] ?? {};
    const vutActivas = toNumber(countRow.cnt);
    const plazasActivas = toNumber(countRow.plz);

    let altas = 0;
    let bajas = 0;
    if (i > 0) {
      const tablePrev = `snap_${i - 1}`;
      const diffReader = await conn.runAndReadAll(`
        SELECT
          (SELECT COUNT(*) FROM (SELECT signatura FROM ${tableCurr} EXCEPT SELECT signatura FROM ${tablePrev})) AS altas,
          (SELECT COUNT(*) FROM (SELECT signatura FROM ${tablePrev} EXCEPT SELECT signatura FROM ${tableCurr})) AS bajas
      `);
      const diffRow = diffReader.getRowObjects()[0] ?? {};
      altas = toNumber(diffRow.altas);
      bajas = toNumber(diffRow.bajas);
    }

    snapshotsDiff.push({
      snapshotFile: snap.fileName,
      capturedAt: snap.capturedAt,
      sha256: snap.sha256,
      vutActivasValencia: vutActivas,
      plazasValencia: plazasActivas,
      altasRespectoAnterior: altas,
      bajasRespectoAnterior: bajas,
      variacionNeta: altas - bajas,
    });
  }

  // ============================================================================
  // 3. Cruce con Datasets Municipales de València (FEMP 80 + Estadística)
  // ============================================================================
  // 3.1. Vulnerabilidad por barrios (Oficina de Estadística / Open Data)
  const vulnSnap = await snapshots.getLatestSnapshot(
    "valencia-estadistica",
    fuentes.valencia_datasets.vulnerabilidad_barrios.package_id
  );
  const vulnByBarrio = new Map<
    string,
    {
      ind_equip: number;
      ind_dem: number;
      ind_econom: number;
      ind_global: number;
      vul_global: string;
    }
  >();

  if (vulnSnap) {
    const vulnPath = path.join(rawDir, "valencia-estadistica", vulnSnap.fileName);
    const vulnReader = await conn.runAndReadAll(`
      SELECT *
      FROM read_csv('${sqlPath(vulnPath)}', header=true, all_varchar=true, ignore_errors=true)
    `);
    for (const r of vulnReader.getRowObjects()) {
      const code = normalizeCodDistBar(
        (r.codbar ?? r["Código barrio"] ?? r["cod_barrio"]) as string | number
      );
      if (!code) continue;
      vulnByBarrio.set(code, {
        ind_equip: toNumber(r.ind_equip ?? r["Índice Equipamientos"], 2.5),
        ind_dem: toNumber(r.ind_dem ?? r["Índice Demográfico"], 2.5),
        ind_econom: toNumber(r.ind_econom ?? r["Índice Económico"], 2.5),
        ind_global: toNumber(r.ind_global ?? r["Índice Global"], 2.5),
        vul_global: String(
          r.vul_global ?? r["Vulnerabilidad Global"] ?? "Vulnerabilidad Media"
        ),
      });
    }
  }

  // 3.2. FEMP Nº 20: Recibos IAE (Censo de empresas y actividades económicas por barrio)
  const iaeSnap = await snapshots.getLatestSnapshot(
    "valencia-femp80",
    "femp20-recibos-iae"
  );
  const iaeByBarrio = new Map<
    string,
    { recibos2020: number; recibosLatest: number; variacionPct: number }
  >();

  if (iaeSnap) {
    const iaePath = path.join(rawDir, "valencia-femp80", iaeSnap.fileName);
    const iaeReader = await conn.runAndReadAll(`
      SELECT
        Periodo AS periodo,
        "Codigo barrio" AS codbar,
        "Numero recibos totales" AS total_recibos
      FROM read_csv('${sqlPath(iaePath)}', delim=';', header=true, all_varchar=true, ignore_errors=true)
    `);
    const tempMap = new Map<string, Map<number, number>>();
    for (const r of iaeReader.getRowObjects()) {
      const code = normalizeCodDistBar(r.codbar as string);
      const yr = toNumber(r.periodo);
      const cnt = toNumber(r.total_recibos);
      if (!code || !yr) continue;
      if (!tempMap.has(code)) tempMap.set(code, new Map());
      tempMap.get(code)!.set(yr, (tempMap.get(code)!.get(yr) ?? 0) + cnt);
    }
    for (const [code, yrMap] of tempMap.entries()) {
      const years = [...yrMap.keys()].sort((a, b) => a - b);
      const firstYr = years[0] ?? 2020;
      const lastYr = years.at(-1) ?? firstYr;
      const v0 = yrMap.get(firstYr) ?? 0;
      const v1 = yrMap.get(lastYr) ?? 0;
      const variacionPct =
        v0 > 0 ? Math.round(((v1 - v0) / v0) * 1000) / 10 : 0;
      iaeByBarrio.set(code, { recibos2020: v0, recibosLatest: v1, variacionPct });
    }
  }

  // 3.3. FEMP Nº 20 (Complemento): Recibos Mesas y Sillas (Presión de terrazas hosteleras por barrio)
  const terrazasSnap = await snapshots.getLatestSnapshot(
    "valencia-femp80",
    "femp20-recibos-mesas-sillas"
  );
  const terrazasByBarrio = new Map<
    string,
    { recibos: number; importeEur: number }
  >();

  if (terrazasSnap) {
    const terrazasPath = path.join(rawDir, "valencia-femp80", terrazasSnap.fileName);
    const terrazasReader = await conn.runAndReadAll(`
      SELECT
        Periodo AS periodo,
        "Codigo Distrito" AS coddist,
        "Codigo Barrio" AS codbar,
        "Numero Recibos totales" AS recibos,
        "Importe recibos totales" AS importe
      FROM read_csv('${sqlPath(terrazasPath)}', delim=';', header=true, all_varchar=true, ignore_errors=true)
    `);
    const latestYearByBarrio = new Map<string, number>();
    for (const r of terrazasReader.getRowObjects()) {
      const code = normalizeCodDistBar(r.coddist as string, r.codbar as string);
      const yr = toNumber(r.periodo);
      if (!code || !yr) continue;
      const prevYr = latestYearByBarrio.get(code) ?? 0;
      if (yr >= prevYr) {
        latestYearByBarrio.set(code, yr);
        terrazasByBarrio.set(code, {
          recibos: toNumber(r.recibos),
          importeEur: Math.round(Number(String(r.importe ?? "0").replace(",", ".")) || 0),
        });
      }
    }
  }

  // 3.4. FEMP Nº 11: Avisos, Quejas y Sugerencias en vía pública por barrio
  const quejasSnap = await snapshots.getLatestSnapshot(
    "valencia-femp80",
    "femp11-quejas-sugerencias"
  );
  const avisosByBarrio = new Map<
    string,
    { totales: number; ruidoConvivencia: number; deterioroViario: number }
  >();
  let totalAvisosCiudad = 0;

  if (quejasSnap) {
    const quejasPath = path.join(rawDir, "valencia-femp80", quejasSnap.fileName);
    const quejasReader = await conn.runAndReadAll(`
      SELECT
        "distrito_localización" AS coddist,
        "barrio_localización" AS codbar,
        COUNT(*) AS totales,
        COUNT(*) FILTER (
          WHERE REGEXP_MATCHES(
            LOWER(COALESCE(tema, '') || ' ' || COALESCE(subtema, '')),
            'acústic|acustic|ruido|molestias|mesas y sillas|convivencia|ocio|policía|policia'
          )
        ) AS ruido_convivencia,
        COUNT(*) FILTER (
          WHERE REGEXP_MATCHES(
            LOWER(COALESCE(tema, '') || ' ' || COALESCE(subtema, '')),
            'limpieza|residuos|contenedores|reparación|reparacion|deficiencias|bache|jardines|obras|alumbrado|mantenimiento|aceras'
          )
        ) AS deterioro_viario
      FROM read_csv('${sqlPath(quejasPath)}', delim=';', header=true, all_varchar=true, ignore_errors=true)
      GROUP BY coddist, codbar
    `);

    for (const r of quejasReader.getRowObjects()) {
      const tot = toNumber(r.totales);
      totalAvisosCiudad += tot;
      const code = normalizeCodDistBar(r.coddist as string, r.codbar as string);
      if (!code) continue;
      const prev = avisosByBarrio.get(code) ?? {
        totales: 0,
        ruidoConvivencia: 0,
        deterioroViario: 0,
      };
      avisosByBarrio.set(code, {
        totales: prev.totales + tot,
        ruidoConvivencia: prev.ruidoConvivencia + toNumber(r.ruido_convivencia),
        deterioroViario: prev.deterioroViario + toNumber(r.deterioro_viario),
      });
    }
  }

  // 3.5. FEMP Nº 12 (Subvenciones/Ayudas) y FEMP Nº 40 (Presupuesto de Gastos / Facturas)
  const subvSnap = await snapshots.getLatestSnapshot(
    "valencia-femp80",
    "femp12-subvenciones-nominativas"
  );
  let totalSubvencionesImporte = 0;
  let totalSubvencionesRegistros = 0;

  if (subvSnap) {
    const subvPath = path.join(rawDir, "valencia-femp80", subvSnap.fileName);
    const subvReader = await conn.runAndReadAll(`
      SELECT
        COUNT(*) AS cnt,
        COALESCE(SUM(TRY_CAST(REPLACE(Importe, ',', '.') AS DOUBLE)), 0) AS importe_total
      FROM read_csv('${sqlPath(subvPath)}', delim=';', header=true, all_varchar=true, ignore_errors=true)
    `);
    const row = subvReader.getRowObjects()[0] ?? {};
    totalSubvencionesRegistros = toNumber(row.cnt);
    totalSubvencionesImporte = Math.round(toNumber(row.importe_total));
  }

  const presSnap = await snapshots.getLatestSnapshot(
    "valencia-femp80",
    "femp40-presupuesto-gastos"
  );
  let presupuestoTotalUltimoAnio = 0;
  let gastoCorrienteBienesServicios = 0;

  if (presSnap) {
    const presPath = path.join(rawDir, "valencia-femp80", presSnap.fileName);
    const presReader = await conn.runAndReadAll(`
      SELECT
        "Año" AS anio,
        TRY_CAST(REPLACE("GASTOS CORRIENTES EN BIENES Y SERVICIOS (operaciones corrientes)", ',', '.') AS DOUBLE) AS bienes_servicios,
        TRY_CAST(REPLACE("Total gastos", ',', '.') AS DOUBLE) AS total_gastos
      FROM read_csv('${sqlPath(presPath)}', delim=';', header=true, all_varchar=true, ignore_errors=true)
      ORDER BY TRY_CAST("Año" AS INTEGER) DESC
      LIMIT 1
    `);
    const row = presReader.getRowObjects()[0] ?? {};
    gastoCorrienteBienesServicios = Math.round(toNumber(row.bienes_servicios));
    presupuestoTotalUltimoAnio = Math.round(toNumber(row.total_gastos));
  }

  // ============================================================================
  // 4. Cruce Espacial por Barrios con Turf.js (`barrios_vulnerabilidad.geojson`)
  // ============================================================================
  const barriosGeoSnap = await snapshots.getLatestSnapshot(
    "valencia-cartografia",
    fuentes.valencia_datasets.barrios.package_id
  );
  if (!barriosGeoSnap) {
    throw new Error("No se encontró el GeoJSON de barrios en data/raw/valencia-cartografia/.");
  }

  const barriosGeoPath = path.join(
    rawDir,
    "valencia-cartografia",
    barriosGeoSnap.fileName
  );
  const barriosGeoRaw = JSON.parse(await readFile(barriosGeoPath, "utf-8")) as {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: { type: string; coordinates: unknown };
      properties: Record<string, unknown>;
    }>;
  };

  // Reparto de VUT por barrio a partir de los códigos postales de València
  const vutByBarrio = new Map<
    string,
    { vut: number; plazas: number; altasRecientes: number }
  >();

  for (const [cp, stats] of cpStatsMap.entries()) {
    const mappings = POSTAL_CODE_TO_BARRIOS[cp];
    if (!mappings) continue;
    for (const m of mappings) {
      const prev = vutByBarrio.get(m.coddistbar) ?? {
        vut: 0,
        plazas: 0,
        altasRecientes: 0,
      };
      vutByBarrio.set(m.coddistbar, {
        vut: prev.vut + Math.round(stats.vut_activas * m.weight),
        plazas: prev.plazas + Math.round(stats.plazas_vut * m.weight),
        altasRecientes:
          prev.altasRecientes + Math.round(stats.altas_recientes * m.weight),
      });
    }
  }

  const barriosIndicators: BarrioIndicators[] = [];

  const enrichedFeatures = barriosGeoRaw.features.map((feature) => {
    const props = feature.properties ?? {};
    const coddistbar =
      normalizeCodDistBar(
        props.coddistbar as string,
        undefined
      ) ??
      normalizeCodDistBar(
        props.coddistrit as string,
        props.codbarrio as string
      ) ??
      "000";

    const coddistrit = String(props.coddistrit ?? coddistbar.slice(0, 2)).padStart(
      2,
      "0"
    );
    const codbarrio = String(props.codbarrio ?? coddistbar.slice(2));
    const nombre = String(props.nombre ?? `Barrio ${coddistbar}`);
    const distrito = DISTRITO_NAMES[coddistrit] ?? `Distrito ${coddistrit}`;

    let areaKm2 = 0.5;
    let centerCoords: [number, number] = [-0.3763, 39.4699];
    try {
      // Cálculo exacto de superficie y centroide con Turf.js
      const areaM2 = turfArea(feature as Parameters<typeof turfArea>[0]);
      if (areaM2 > 0) {
        areaKm2 = Math.round((areaM2 / 1_000_000) * 1000) / 1000;
      }
      const c = turfCentroid(feature as Parameters<typeof turfCentroid>[0]);
      if (
        Array.isArray(c.geometry?.coordinates) &&
        c.geometry.coordinates.length >= 2
      ) {
        centerCoords = [
          Math.round(Number(c.geometry.coordinates[0]) * 100000) / 100000,
          Math.round(Number(c.geometry.coordinates[1]) * 100000) / 100000,
        ];
      }
    } catch {
      // Fallback si algún polígono tiene geometría degenerada
    }

    const vutStats = vutByBarrio.get(coddistbar) ?? {
      vut: 0,
      plazas: 0,
      altasRecientes: 0,
    };
    const densidadVutKm2 =
      areaKm2 > 0 ? Math.round((vutStats.vut / areaKm2) * 10) / 10 : 0;

    const iaeStats = iaeByBarrio.get(coddistbar) ?? {
      recibos2020: 0,
      recibosLatest: 0,
      variacionPct: 0,
    };
    const terrazasStats = terrazasByBarrio.get(coddistbar) ?? {
      recibos: 0,
      importeEur: 0,
    };
    const avisosStats = avisosByBarrio.get(coddistbar) ?? {
      totales: 0,
      ruidoConvivencia: 0,
      deterioroViario: 0,
    };
    const vulnStats = vulnByBarrio.get(coddistbar) ?? {
      ind_equip: 2.2,
      ind_dem: 2.4,
      ind_econom: 2.5,
      ind_global: 2.4,
      vul_global: "Vulnerabilidad Media",
    };

    // Subíndice 1: Presión Turística Residencial (0-100)
    const presionTuristica = clampScore(
      Math.min(60, (densidadVutKm2 / 350) * 60) +
        Math.min(25, (vutStats.vut / 280) * 25) +
        Math.min(15, (vutStats.altasRecientes / 90) * 15)
    );

    // Subíndice 2: Desplazamiento Comercial y Terciarización Hostelera (0-100)
    const densidadTerrazasKm2 = areaKm2 > 0 ? terrazasStats.recibos / areaKm2 : 0;
    const penalizacionCaidaIae =
      iaeStats.variacionPct < 0 ? Math.min(35, Math.abs(iaeStats.variacionPct) * 2.5) : 0;
    const desplazamientoComercial = clampScore(
      Math.min(50, (densidadTerrazasKm2 / 220) * 50) +
        penalizacionCaidaIae +
        Math.min(25, presionTuristica * 0.25)
    );

    // Subíndice 3: Brecha de Equidad Urbana y Deterioro Reportado (0-100)
    const densidadAvisosKm2 = areaKm2 > 0 ? avisosStats.totales / areaKm2 : 0;
    const ratioRuido =
      avisosStats.totales > 0
        ? avisosStats.ruidoConvivencia / avisosStats.totales
        : 0;
    const brechaEquidadUrbana = clampScore(
      Math.min(45, (densidadAvisosKm2 / 6500) * 45) +
        Math.min(30, ratioRuido * 120) +
        Math.min(25, ((vulnStats.ind_equip - 1) / 4) * 25)
    );

    // Subíndice 4: Vulnerabilidad Socioeconómica y Habitacional (0-100)
    const baseVulnScore = ((vulnStats.ind_global - 1) / 3.8) * 70;
    const vulnerabilidadResidencial = clampScore(
      baseVulnScore + presionTuristica * 0.3
    );

    // Índice Sintético de Vulnerabilidad y Presión Barrial (ISVP, 0-100)
    const isvp = clampScore(
      0.35 * presionTuristica +
        0.25 * desplazamientoComercial +
        0.20 * brechaEquidadUrbana +
        0.20 * vulnerabilidadResidencial
    );

    const nivelAlerta: BarrioIndicators["nivel_alerta"] =
      isvp >= 62
        ? "Crítica"
        : isvp >= 46
          ? "Alta"
          : isvp >= 32
            ? "Moderada"
            : "Baja";

    const indicator: BarrioIndicators = {
      coddistbar,
      coddistrit,
      codbarrio,
      nombre,
      distrito,
      area_km2: areaKm2,
      centroid: centerCoords,
      vut_activas: vutStats.vut,
      plazas_vut: vutStats.plazas,
      vut_altas_recientes: vutStats.altasRecientes,
      densidad_vut_km2: densidadVutKm2,
      recibos_iae: iaeStats.recibosLatest,
      variacion_iae_pct: iaeStats.variacionPct,
      recibos_terrazas: terrazasStats.recibos,
      importe_terrazas_eur: terrazasStats.importeEur,
      avisos_totales: avisosStats.totales,
      avisos_ruido_convivencia: avisosStats.ruidoConvivencia,
      avisos_deterioro_viario: avisosStats.deterioroViario,
      ind_vulnerabilidad_municipal: vulnStats.ind_global,
      etiqueta_vulnerabilidad_municipal: vulnStats.vul_global,
      presion_turistica: presionTuristica,
      desplazamiento_comercial: desplazamientoComercial,
      brecha_equidad_urbana: brechaEquidadUrbana,
      vulnerabilidad_residencial: vulnerabilidadResidencial,
      isvp,
      nivel_alerta: nivelAlerta,
    };

    barriosIndicators.push(indicator);

    return {
      ...feature,
      properties: {
        ...indicator,
      },
    };
  });

  barriosIndicators.sort((a, b) => b.isvp - a.isvp);

  // ============================================================================
  // 5. Registro Público de Gobernanza y Auditoría FEMP 80 (Ley 1/2022)
  // ============================================================================
  const auditoriaFemp80 = {
    generatedAt: new Date().toISOString(),
    marcoLegal: "Ley 1/2022 de Transparencia y Buen Gobierno de la Comunitat Valenciana + Guía FEMP 80 Datasets Esenciales",
    canalesOficiales: {
      ...fuentes.canales_gobernanza,
      oficinaEstadisticaEmail: fuentes.oficina_estadistica_valencia.email_solicitudes,
      sedeEstadistica: fuentes.valencia_estadistica_sede,
    },
    datasetsAuditados: [
      {
        codigo: "GVA tur-gestur-vt",
        titulo: "Registro de viviendas de uso turístico vigentes (Generalitat Valenciana)",
        packageId: fuentes.gva_viviendas_turisticas_dataset_id,
        estadoApertura: "Abierto (Sin histórico en origen)",
        desagregacionEspacial: "Dirección postal y código postal (sin coordenadas X/Y ni serie histórica)",
        registrosCapturados: totalVutValencia,
        incidenciaDetectada:
          "Dades Obertes GVA sobrescribe el CSV vivo sin conservar serie histórica de altas y bajas ni coordenadas geocodificadas por portal.",
        accionGobernanza:
          "Construcción de serie longitudinal propia mediante capturas inmutables semanales en radar-vivienda y solicitud de inclusión de referencia catastral normalizada y coordenadas ETRS89 vía mecanismo participativo Ley 1/2022.",
      },
      {
        codigo: "FEMP Nº 11",
        titulo: "Avisos e incidencias ciudadanas en la vía pública (Quejas y Sugerencias)",
        packageId: fuentes.valencia_datasets.femp11_avisos_quejas.package_id,
        estadoApertura: "Abierto con desagregación barrial",
        desagregacionEspacial: "Distrito y código de barrio (coddistbar)",
        registrosCapturados: totalAvisosCiudad,
        incidenciaDetectada:
          "Incluye temática y barrio de localización, pero no publica tiempo medio de resolución ni estado de cierre de cada incidencia.",
        accionGobernanza:
          "Solicitar al Servicio de Transparencia y Gobierno Abierto la incorporación de fecha de resolución y coste de intervención asociada.",
      },
      {
        codigo: "FEMP Nº 12",
        titulo: "Ayudas sociales y subvenciones otorgadas a personas y organizaciones",
        packageId: fuentes.valencia_datasets.femp12_ayudas_subvenciones.package_id,
        estadoApertura: "Parcial (Solo subvenciones nominativas sin barrio)",
        desagregacionEspacial: "Agregado municipal (sin desagregación por barrio ni sección censal)",
        registrosCapturados: totalSubvencionesRegistros,
        incidenciaDetectada:
          "El dataset público recoge subvenciones nominativas a entidades pero omite estadísticas anonimizadas por barrio de ayudas de emergencia habitacional y alquiler.",
        accionGobernanza:
          "Solicitud formal a la Oficina de Estadística (infoestadistica@valencia.es, procedimiento AE.OT.10) de serie trimestral anonimizada por barrio de prestaciones económicas de urgencia social.",
      },
      {
        codigo: "FEMP Nº 20",
        titulo: "Censo de empresas, actividades económicas (IAE) y ocupación comercial (Terrazas)",
        packageId: `${fuentes.valencia_datasets.femp20_censo_actividades_iae.package_id} + ${fuentes.valencia_datasets.femp20_censo_actividades_iae.terrazas_package_id}`,
        estadoApertura: "Abierto con desagregación barrial (2020-2025)",
        desagregacionEspacial: "Barrio (coddistbar) y Distrito",
        registrosCapturados: iaeByBarrio.size,
        incidenciaDetectada:
          "Permite medir recibos empresariales, locales y terrazas por barrio, pero no desglosa epígrafes IAE específicos de comercio tradicional de alimentación frente a franquicias turísticas.",
        accionGobernanza:
          "Petición de desagregación por sección/agrupación de epígrafe IAE por barrio para auditar la sustitución de comercio cotidiano por hostelería.",
      },
      {
        codigo: "FEMP Nº 40",
        titulo: "Facturas municipales, anticipos de caja fija y ejecución presupuestaria",
        packageId: `${fuentes.valencia_datasets.femp40_facturas_presupuesto.package_id} + ${fuentes.valencia_datasets.femp40_facturas_presupuesto.caja_fija_package_id}`,
        estadoApertura: "Parcial (Agregado por capítulos sin imputación territorial)",
        desagregacionEspacial: "Agregado municipal por capítulo/servicio",
        registrosCapturados: presupuestoTotalUltimoAnio,
        incidenciaDetectada:
          "El presupuesto y caja fija no incluyen código de barrio ni distrito de ejecución de los contratos de mantenimiento urbano.",
        accionGobernanza:
          "Solicitar apertura del dataset completo de facturas municipales (FEMP Nº 40) con código de proyecto territorializado por distrito/barrio.",
      },
    ],
  };

  // ============================================================================
  // 6. Guardado de Artefactos Procesados (JSON y GeoJSON)
  // ============================================================================
  const geojsonOutput = {
    type: "FeatureCollection" as const,
    metadata: {
      project: "radar-vivienda",
      generatedAt: new Date().toISOString(),
      sourceSnapshot: latestGvaMeta.fileName,
      totalBarrios: enrichedFeatures.length,
    },
    features: enrichedFeatures,
  };

  const seriesHistoricasOutput = {
    generatedAt: new Date().toISOString(),
    snapshotsDiff,
    serieAnualAltas,
    distritosResumen: Object.entries(DISTRITO_NAMES).map(([coddistrit, nombreDistrito]) => {
      const barriosDelDistrito = barriosIndicators.filter(
        (b) => b.coddistrit === coddistrit
      );
      const vut = barriosDelDistrito.reduce((acc, b) => acc + b.vut_activas, 0);
      const plazas = barriosDelDistrito.reduce((acc, b) => acc + b.plazas_vut, 0);
      const avisos = barriosDelDistrito.reduce((acc, b) => acc + b.avisos_totales, 0);
      const terrazas = barriosDelDistrito.reduce((acc, b) => acc + b.recibos_terrazas, 0);
      const isvpPromedio =
        barriosDelDistrito.length > 0
          ? Math.round(
              (barriosDelDistrito.reduce((acc, b) => acc + b.isvp, 0) /
                barriosDelDistrito.length) *
                10
            ) / 10
          : 0;
      return {
        coddistrit,
        distrito: nombreDistrito,
        barriosCount: barriosDelDistrito.length,
        vut_activas: vut,
        plazas_vut: plazas,
        avisos_totales: avisos,
        recibos_terrazas: terrazas,
        isvp_promedio: isvpPromedio,
      };
    }).sort((a, b) => b.vut_activas - a.vut_activas),
    codigosPostalesRanking: [...cpStatsMap.values()].slice(0, 26),
  };

  const resumenObservatorio = {
    project: "radar-vivienda",
    title:
      "Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio",
    updatedAt: new Date().toISOString(),
    kpis: {
      vutActivasValencia: totalVutValencia,
      plazasTuristicasValencia: totalPlazasValencia,
      vutActivasComunitat: totalVutComunitat,
      altasRecientes2024a2026: altas2024a2026Valencia,
      barriosAnalizados: barriosIndicators.length,
      barriosAlertaCriticaOAlta: barriosIndicators.filter(
        (b) => b.nivel_alerta === "Crítica" || b.nivel_alerta === "Alta"
      ).length,
      avisosCiudadanosAnalizados: totalAvisosCiudad,
      subvencionesNominativasEur: totalSubvencionesImporte,
      presupuestoMunicipalAnalizadoEur: presupuestoTotalUltimoAnio,
      gastoBienesServiciosEur: gastoCorrienteBienesServicios,
      snapshotsAcumulados: gvaSnapshots.length,
    },
    latestSnapshot: latestGvaMeta,
    topBarriosPresion: barriosIndicators.slice(0, 15),
    allBarrios: barriosIndicators,
  };

  await saveProcessedOutput({
    fileName: "barrios_vulnerabilidad.geojson",
    content: JSON.stringify(geojsonOutput),
    contentType: "application/geo+json",
  });

  await saveProcessedOutput({
    fileName: "series_historicas.json",
    content: JSON.stringify(seriesHistoricasOutput, null, 2),
    contentType: "application/json",
  });

  await saveProcessedOutput({
    fileName: "auditoria_femp80.json",
    content: JSON.stringify(auditoriaFemp80, null, 2),
    contentType: "application/json",
  });

  await saveProcessedOutput({
    fileName: "resumen_observatorio.json",
    content: JSON.stringify(resumenObservatorio, null, 2),
    contentType: "application/json",
  });

  console.log(
    `[processor] Procesado DuckDB + Turf.js completado: ${totalVutValencia} VUT en València (${totalPlazasValencia} plazas) cruzadas en ${barriosIndicators.length} barrios.`
  );

  return resumenObservatorio;
}
