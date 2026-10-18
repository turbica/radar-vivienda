import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DuckDBInstance } from "@duckdb/node-api";
import { loadFuentesConfig } from "../config.ts";
import { DISTRITO_NAMES, POSTAL_CODE_TO_BARRIOS } from "../processor/postal-barrio-map.ts";

describe("radar-vivienda collector & analytical engine unit tests", () => {
  it("loads and validates config/fuentes.json without hardcoded URLs", async () => {
    const cfg = await loadFuentesConfig();
    assert.equal(cfg.gva_viviendas_turisticas_dataset_id, "tur-gestur-vt");
    assert.equal(cfg.datasets_municipales_femp80.length, 4);
    assert.equal(cfg.valencia_datasets.barrios.package_id, "barris-barrios");
  });

  it("validates postal code to barrio weights sum to 1.0", () => {
    for (const [cp, list] of Object.entries(POSTAL_CODE_TO_BARRIOS)) {
      const sum = list.reduce((acc, item) => acc + item.weight, 0);
      assert.ok(
        Math.abs(sum - 1.0) < 0.001,
        `El código postal ${cp} suma ${sum} en lugar de 1.0`
      );
    }
    assert.equal(Object.keys(DISTRITO_NAMES).length, 19);
  });

  it("computes SQL differential altas and bajas between snapshots in DuckDB", async () => {
    const db = await DuckDBInstance.create(":memory:");
    const conn = await db.connect();

    await conn.run(`
      CREATE TABLE snap_0 (signatura VARCHAR, plazas_totales INTEGER);
      INSERT INTO snap_0 VALUES ('VT-100', 4), ('VT-101', 2), ('VT-102', 6);

      CREATE TABLE snap_1 (signatura VARCHAR, plazas_totales INTEGER);
      INSERT INTO snap_1 VALUES ('VT-100', 4), ('VT-102', 6), ('VT-103', 4), ('VT-104', 8);
    `);

    const reader = await conn.runAndReadAll(`
      SELECT
        (SELECT COUNT(*) FROM (SELECT signatura FROM snap_1 EXCEPT SELECT signatura FROM snap_0)) AS altas,
        (SELECT COUNT(*) FROM (SELECT signatura FROM snap_0 EXCEPT SELECT signatura FROM snap_1)) AS bajas
    `);

    const row = reader.getRowObjects()[0] ?? {};
    assert.equal(Number(row.altas), 2); // VT-103, VT-104
    assert.equal(Number(row.bajas), 1); // VT-101
  });

  it("validates citizen metrics catalog and plain-language narrative generator", async () => {
    const catalogUrl = new URL(
      "../../web/src/lib/metrics-catalog.ts",
      import.meta.url
    ).href;
    const {
      CORE_VECTORS_GUIDE,
      EMPIRICAL_METRICS_GLOSSARY,
      ISVP_LEVELS,
      buildBarrioNarrative,
    } = await import(catalogUrl);

    assert.equal(CORE_VECTORS_GUIDE.length, 5);
    assert.equal(ISVP_LEVELS.length, 4);
    assert.ok(EMPIRICAL_METRICS_GLOSSARY.length >= 10);

    const narrative = buildBarrioNarrative(
      {
        nombre: "RUSFA",
        distrito: "L'EIXAMPLE",
        isvp: 68.5,
        nivel_alerta: "Crítica",
        vut_activas: 280,
        plazas_vut: 1120,
        vut_altas_recientes: 140,
        densidad_vut_km2: 310.5,
        presion_turistica: 88.2,
        desplazamiento_comercial: 74.0,
        brecha_equidad_urbana: 61.0,
        vulnerabilidad_residencial: 42.0,
        recibos_terrazas: 195,
        avisos_totales: 1850,
        etiqueta_vulnerabilidad_municipal: "Baja",
      },
      33.8,
      42.3
    );
    assert.ok(narrative.includes("Alerta Crítica"));
    assert.ok(narrative.includes("68.5 sobre 100"));
  });
});

