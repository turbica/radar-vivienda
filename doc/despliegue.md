# Guía de Despliegue y Operación — `radar-vivienda`

Al ser un proyecto **Open Source (AGPL-3.0)**, el repositorio no está acoplado a ninguna cuenta privada de nube para su despliegue continuo. Cualquier persona, colectivo vecinal, universidad o institución puede levantar el observatorio completo en su propia infraestructura o utilizando las capas gratuitas (*Always Free*) de **Google Cloud Platform (GCP)** y **Firebase**.

---

## 1. Requisitos previos

- **Opción con Docker (recomendada para despliegue rápido)**:
  - Docker Engine 24+ y Docker Compose v2+.
- **Opción de desarrollo nativo**:
  - **Node.js 24 LTS** (incluye `.nvmrc`).
  - **pnpm 10+** (`corepack enable && corepack prepare pnpm@latest --activate`).

---

## 2. Puesta en marcha local con Node.js y `pnpm`

```bash
# 1. Instalar dependencias del monorepo (src/ y web/)
pnpm install

# 2. (Opcional) Descargar el histórico acumulado publicado en GitHub Releases
pnpm data:sync

# 3. Ejecutar una captura e ingesta de datos + cálculo diferencial en DuckDB
pnpm collect

# 4. Levantar el panel web en modo desarrollo (http://localhost:4321)
pnpm dev
```

---

## 3. Despliegue rápido con Docker Compose (Local o VPS)

El archivo [`docker-compose.yml`](../docker-compose.yml) define dos servicios ligeros que comparten el volumen local `./data`:

- **`collector`**: ejecuta la ingesta inicial al arrancar y programa ejecuciones periódicas (por defecto cada semana) guardando las instantáneas en `/app/data/raw` y los cruces en `/app/data/processed`.
- **`web`**: sirve el panel web generado con Astro en el puerto `8080`.

```bash
# 1. Copiar variables de entorno de ejemplo
cp .env.example .env

# 2. Construir y levantar los servicios en segundo plano
docker compose up -d --build

# 3. Consultar logs de la ingesta
docker compose logs -f collector
```

El panel web estará disponible en `http://localhost:8080`.

---

## 4. Despliegue coste 0 € en Google Cloud Platform / Firebase (Free Tier)

Si deseas alojar una instancia pública en la nube sin coste mensual dentro de los límites *Always Free* de GCP y Firebase:

### 4.1. Almacenamiento en Google Cloud Storage (Opcional para instancias en la nube)

1. Crea un bucket en la región `us-east1` / `europe-west1` (p. ej. `mi-radar-vivienda-data`).
2. Configura las variables en tu entorno o contenedor:
   ```env
   STORAGE_DRIVER=gcs
   GCS_BUCKET_NAME=mi-radar-vivienda-data
   ```
3. Cuando `STORAGE_DRIVER=gcs`, el colector guarda cada snapshot en `./data/` y lo sincroniza automáticamente con el bucket.

### 4.2. Opción A: Panel Web estático en Firebase Hosting (Recomendado, 0 €/mes)

Como el motor analítico genera archivos estáticos optimizados (`data/processed/*.json` y `*.geojson`), el panel de Astro se compila a HTML/CSS/JS estático que puede servirse desde el CDN de **Firebase Hosting** (Plan Spark gratuito: 10 GB de almacenamiento y 360 MB/día de transferencia):

```bash
# 1. Sincronizar el último histórico o ejecutar la ingesta
pnpm data:sync
pnpm collect

# 2. Compilar el panel web estático (incluye los datos procesados de lectura pública)
pnpm build

# 3. Desplegar a tu proyecto de Firebase Hosting
npx firebase-tools deploy --only hosting
```

### 4.3. Opción B: Despliegue en contenedores con GCP Cloud Run (Web + Cloud Run Job)

Si prefieres desplegar los contenedores directamente en **Google Cloud Run** (2 millones de peticiones gratis al mes y 180.000 vCPU-segundos en Cloud Run Jobs):

```bash
# 1. Construir y subir la imagen del colector y de la web a Artifact Registry
gcloud builds submit --tag europe-southwest1-docker.pkg.dev/TU_PROYECTO/radar/radar-vivienda:latest

# 2. Crear el Cloud Run Job para la ingesta semanal
gcloud run jobs create radar-vivienda-collector \
  --image europe-southwest1-docker.pkg.dev/TU_PROYECTO/radar/radar-vivienda:latest \
  --command "pnpm" --args "collect" \
  --set-env-vars="STORAGE_DRIVER=gcs,GCS_BUCKET_NAME=mi-radar-vivienda-data" \
  --region europe-southwest1

# 3. Desplegar el servicio web en Cloud Run
gcloud run deploy radar-vivienda-web \
  --image europe-southwest1-docker.pkg.dev/TU_PROYECTO/radar/radar-vivienda:latest \
  --port 8080 \
  --allow-unauthenticated \
  --region europe-southwest1
```

---

## 5. Automatización de Ingesta en el Repositorio (GitHub Actions)

El workflow [`.github/workflows/ingesta-semanal.yml`](../.github/workflows/ingesta-semanal.yml) se ejecuta todos los lunes a las 06:00 UTC (o manualmente vía `workflow_dispatch`):

1. Descarga el último snapshot publicado en **GitHub Releases** (`latest-snapshots`) para conservar toda la serie temporal previa.
2. Ejecuta `pnpm collect` para capturar la fotografía actual de `tur-gestur-vt` (GVA) y consultar las novedades en los datasets CKAN municipales.
3. Calcula las diferencias semanales (altas, bajas y concentración por barrio/código postal) con **DuckDB**.
4. Publica un nuevo paquete comprimido (`snapshots-YYYY-MM-DD.tar.gz`) en **GitHub Releases**, manteniendo el repositorio git ligero (sin versionar `data/`) pero garantizando que el histórico público nunca se pierda.
