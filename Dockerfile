# syntax=docker/dockerfile:1

# ============================================================================
# Base con Node.js 24 LTS y pnpm
# ============================================================================
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app

# ============================================================================
# Instalación de dependencias del monorepo
# ============================================================================
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY src/package.json ./src/package.json
COPY web/package.json ./web/package.json
RUN pnpm install --frozen-lockfile

# ============================================================================
# Construcción de colectores (src/) y panel web (web/)
# ============================================================================
FROM deps AS builder
ARG PUBLIC_DATA_BASE_URL=/data/processed
ENV PUBLIC_DATA_BASE_URL=${PUBLIC_DATA_BASE_URL}
COPY tsconfig.base.json ./
COPY config ./config
COPY src ./src
COPY web ./web
COPY data/processed ./data/processed
RUN mkdir -p data/raw data/processed && pnpm build

# ============================================================================
# Target 1: Servicio Colector (ETL + DuckDB + Turf.js)
# Funciona tanto con volumen local (Docker Compose) como stateless en GCP Cloud Run Jobs (STORAGE_DRIVER=gcs)
# ============================================================================
FROM base AS collector
ENV NODE_ENV=production
COPY --from=builder /app /app
CMD ["pnpm", "--filter", "@radar-vivienda/collector", "start:daemon"]

# ============================================================================
# Target 2: Servicio Web (Servidor estático ligero sobre puerto 8080, compatible con Cloud Run y Docker Compose)
# ============================================================================
FROM nginx:1.27-alpine AS web
COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY --from=builder /app/data/processed /app/data/processed
RUN printf 'server {\n\
    listen 8080;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/geo+json application/javascript;\n\
    location /data/processed/ {\n\
        alias /app/data/processed/;\n\
        add_header Cache-Control "public, max-age=300";\n\
        add_header Access-Control-Allow-Origin "*";\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html =404;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
