# Especificación del Módulo Común: `turbica/valencia-open-data-core`

## 1. Propósito

Librería compartida en **TypeScript (Node.js 24, ESM)** bajo licencia **AGPL-3.0**, utilizada como dependencia (`github:turbica/valencia-open-data-core`) por los tres observatorios hermanos:

| Proyecto | Uso del módulo común |
|---|---|
| **`radar-vivienda`** | Cliente CKAN GVA (`dadesobertes.gva.es`) y Ayuntamiento de València (`opendata.vlci.valencia.es`), descarga inmutable del CSV `tur-gestur-vt`, cruces FEMP 80 (Avisos n.º 11, Ayudas n.º 12, Censo empresas n.º 20, Facturas n.º 40) y almacenamiento híbrido. |
| **`escudo-hidrologico`** | Cliente CKAN municipal (Equipamientos n.º 37, Calidad del agua n.º 16), descarga de capas PATRICOVA y almacenamiento inmutable de series SAIH Júcar. |
| **`monitor-vmp`** | Cliente CKAN municipal (Carril bici n.º 19, Callejero n.º 18, Avisos n.º 11, indicadores Agenda 2030) y descarga de capas vectoriales del Geoportal. |

---

## 2. Estructura del repositorio `turbica/valencia-open-data-core`

```text
valencia-open-data-core/
├── package.json          # Exports ESM + tipos TypeScript nativos / compilados en dist/
├── tsconfig.json         # Target ES2024, NodeNext, strict: true
├── LICENSE               # GNU AGPL-3.0
├── README.md             # Documentación de uso en los tres proyectos
└── src/
    ├── index.ts          # Barrel de exportaciones públicas
    ├── ckan/
    │   ├── client.ts     # Cliente HTTP para /api/3/action (package_show, package_search, resource_show, datastore_search)
    │   └── types.ts      # Esquemas Zod y tipos TypeScript de respuestas CKAN v3
    ├── snapshot/
    │   ├── downloader.ts # Descarga resiliente con reintentos exponenciales, ETag/Last-Modified y SHA-256
    │   └── storage.ts    # Guardado inmutable en data/raw/ + adaptador opcional Google Cloud Storage
    └── geo/
        └── normalize.ts  # Normalización CRS (EPSG:25830 -> WGS84 EPSG:4326) y validación GeoJSON
```

---

## 3. API Pública del Módulo (`src/index.ts`)

### 3.1. `CkanClient` (`src/ckan/client.ts`)

Consulta cualquier portal basado en CKAN (`/api/3/action`):
- `new CkanClient({ baseUrl, userAgent, timeoutMs })`
- `getPackage(idOrName: string): Promise<CkanPackage>` (`GET /package_show?id=...`)
- `searchPackages(query: CkanSearchQuery): Promise<CkanSearchResult>` (`GET /package_search?q=...`)
- `getResource(id: string): Promise<CkanResource>` (`GET /resource_show?id=...`)
- `hasResourceChanged(resource: CkanResource, lastKnownModified?: string, lastKnownHash?: string): boolean`

### 3.2. `SnapshotManager` (`src/snapshot/storage.ts`)

Garantiza la convención de los tres proyectos: **las descargas de `data/raw/` nunca se sobrescriben**.
- `captureResource(options: CaptureOptions): Promise<SnapshotMetadata>`
  - Descarga el recurso verificando cabeceras HTTP.
  - Calcula `sha256` del binario recibido.
  - Si el hash coincide con la última captura registrada del mismo dataset, puede omitir duplicados binarios idénticos o registrar la comprobación en `.meta.json`.
  - Guarda siempre con prefijo temporal `YYYY-MM-DD_<dataset-id>.<ext>` y replica opcionalmente en Google Cloud Storage (`STORAGE_DRIVER=gcs`).

---

## 4. Cómo consumirlo desde `radar-vivienda`

En [`src/package.json`](../src/package.json):

```json
{
  "dependencies": {
    "@turbica/valencia-open-data-core": "github:turbica/valencia-open-data-core#main"
  }
}
```
