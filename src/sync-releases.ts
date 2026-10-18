import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDataDirs, REPO_ROOT } from "./config.ts";

const execFileAsync = promisify(execFile);

/**
 * Descarga y extrae el último paquete de snapshots públicos desde GitHub Releases
 * para hidratar `./data/raw` y `./data/processed` en cualquier clon local.
 */
async function syncFromGitHubReleases() {
  const repo = process.env.GITHUB_SNAPSHOTS_REPO ?? "turbica/radar-vivienda";
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "radar-vivienda-sync/0.1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  console.log(`[data:sync] Consultando última release en ${repo}...`);
  const response = await fetch(apiUrl, { headers });
  if (response.status === 404) {
    console.log("[data:sync] Todavía no hay releases de snapshots publicadas en el repositorio.");
    return;
  }
  if (!response.ok) {
    throw new Error(`Error al consultar GitHub Releases (${response.status})`);
  }

  const release = (await response.json()) as {
    tag_name: string;
    assets?: Array<{ name: string; browser_download_url: string }>;
  };

  const asset = release.assets?.find((a) => a.name.endsWith(".tar.gz"));
  if (!asset) {
    console.log(`[data:sync] La release ${release.tag_name} no contiene archivo .tar.gz.`);
    return;
  }

  const { rawDir, processedDir } = getDataDirs();
  await mkdir(rawDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });

  const archivePath = path.join(REPO_ROOT, "data", asset.name);
  console.log(`[data:sync] Descargando ${asset.name} (${release.tag_name})...`);
  const assetRes = await fetch(asset.browser_download_url, { headers });
  if (!assetRes.ok) {
    throw new Error(`No se pudo descargar el asset ${asset.name} (${assetRes.status})`);
  }

  const buffer = Buffer.from(await assetRes.arrayBuffer());
  await writeFile(archivePath, buffer);

  console.log("[data:sync] Extrayendo histórico en ./data/ ...");
  await execFileAsync("tar", ["-xzf", archivePath, "-C", REPO_ROOT]);
  console.log("[data:sync] Sincronización completada.");
}

syncFromGitHubReleases().catch((err: unknown) => {
  console.error("[data:sync] Aviso:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
