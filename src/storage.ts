import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Storage } from "@google-cloud/storage";
import {
  SnapshotManager,
  SnapshotMetadataSchema,
  type SnapshotMetadata,
  type SnapshotMirrorAdapter,
} from "@turbica/valencia-open-data-core";
import { getDataDirs } from "./config.ts";

/**
 * Crea un adaptador bidireccional completo para Google Cloud Storage
 * cuando `STORAGE_DRIVER=gcs` y `GCS_BUCKET_NAME` están definidos.
 * Permite que contenedores sin estado (como GCP Cloud Run Jobs y Cloud Run Services)
 * hidraten `data/raw/` y `data/processed/` desde el bucket y persistan allí todos los resultados.
 */
export function createOptionalGcsMirror(): SnapshotMirrorAdapter | undefined {
  if (process.env.STORAGE_DRIVER !== "gcs" || !process.env.GCS_BUCKET_NAME) {
    return undefined;
  }

  const bucketName = process.env.GCS_BUCKET_NAME;
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);

  return {
    async mirrorSnapshot({ metadata, content }) {
      await bucket.file(metadata.relativePath).save(content, {
        resumable: false,
        metadata: {
          metadata: {
            category: metadata.category,
            datasetId: metadata.datasetId,
            sourceUrl: metadata.sourceUrl,
            capturedAt: metadata.capturedAt,
            sha256: metadata.sha256,
          },
        },
      });
      await bucket
        .file(`${metadata.relativePath}.meta.json`)
        .save(JSON.stringify(metadata, null, 2), {
          resumable: false,
          contentType: "application/json",
        });
    },

    async listRemoteSnapshots(category: string, datasetId?: string) {
      const prefix = `raw/${category}/`;
      const [files] = await bucket.getFiles({ prefix });
      const metaFiles = files.filter((f) => f.name.endsWith(".meta.json"));
      const results: SnapshotMetadata[] = [];

      for (const file of metaFiles) {
        try {
          const [buf] = await file.download();
          const parsed = SnapshotMetadataSchema.parse(
            JSON.parse(buf.toString("utf-8"))
          );
          if (!datasetId || parsed.datasetId === datasetId) {
            results.push(parsed);
          }
        } catch {
          // Ignorar metadatos remotos no válidos
        }
      }
      return results.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    },

    async downloadRemoteSnapshot(relativePath: string) {
      const file = bucket.file(relativePath);
      const [exists] = await file.exists();
      if (!exists) return null;
      const [buf] = await file.download();
      return buf;
    },

    async saveProcessedArtifact({ relativePath, content, contentType }) {
      await bucket.file(relativePath).save(content, {
        resumable: false,
        contentType: contentType ?? "application/octet-stream",
        metadata: {
          cacheControl: "public, max-age=300",
        },
      });
    },

    async downloadProcessedArtifact(relativePath: string) {
      const file = bucket.file(relativePath);
      const [exists] = await file.exists();
      if (!exists) return null;
      const [buf] = await file.download();
      return buf;
    },
  };
}

let cachedManager: SnapshotManager | null = null;

/**
 * Instancia configurada de `SnapshotManager` (`@turbica/valencia-open-data-core`)
 * apuntando a `./data/raw/` y `./data/processed/` con soporte híbrido local + GCS opcional.
 */
export function createSnapshotManager(): SnapshotManager {
  if (cachedManager) return cachedManager;
  const { rawDir, processedDir } = getDataDirs();
  cachedManager = new SnapshotManager({
    rawDir,
    processedDir,
    userAgent:
      "radar-vivienda-observatorio/0.1.0 (+https://github.com/turbica/radar-vivienda)",
    mirror: createOptionalGcsMirror(),
  });
  return cachedManager;
}

/**
 * Guarda un archivo en `data/processed/`, lo replica en GCS (si `STORAGE_DRIVER=gcs`)
 * y lo sincroniza en `web/public/data/processed/` para que tanto el servidor estático Astro
 * como el contenedor Nginx de Docker puedan servirlo sin acoplamiento.
 */
export async function saveProcessedOutput(params: {
  fileName: string;
  content: Buffer | string;
  contentType?: string;
}): Promise<string> {
  const manager = createSnapshotManager();
  const { webPublicDataDir } = getDataDirs();

  const savedPath = await manager.saveProcessedArtifact({
    fileName: params.fileName,
    content: params.content,
    contentType: params.contentType,
  });

  await mkdir(webPublicDataDir, { recursive: true });
  const buf =
    typeof params.content === "string"
      ? Buffer.from(params.content, "utf-8")
      : params.content;
  await writeFile(path.join(webPublicDataDir, params.fileName), buf);

  return savedPath;
}

/**
 * Sincroniza cualquier archivo existente en `data/processed/` hacia `web/public/data/processed/`.
 */
export async function syncProcessedToWebPublic(): Promise<void> {
  const { processedDir, webPublicDataDir } = getDataDirs();
  await mkdir(processedDir, { recursive: true });
  await mkdir(webPublicDataDir, { recursive: true });

  const entries = await readdir(processedDir);
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = path.join(processedDir, entry);
    const content = await readFile(fullPath);
    await writeFile(path.join(webPublicDataDir, entry), content);
  }
}
