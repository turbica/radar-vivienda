import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://radar-vivienda.valencia.es",
  output: "static",
  compressHTML: true,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("maplibre-gl")) {
              return "maplibre-vendor";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "charts-vendor";
            }
          },
        },
      },
    },
  },
});
