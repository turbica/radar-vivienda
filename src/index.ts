import { runAllCollectors } from "./collectors/collect-all.ts";
import { runAnalyticalProcessor } from "./processor/duckdb-engine.ts";
import { syncProcessedToWebPublic } from "./storage.ts";

async function main() {
  const mode = process.argv[2] ?? "collect";

  if (mode === "collect") {
    await runAllCollectors();
    await runAnalyticalProcessor();
  } else if (mode === "process") {
    await runAnalyticalProcessor();
  } else if (mode === "sync-web") {
    await syncProcessedToWebPublic();
  } else if (mode === "daemon") {
    const intervalSec = Number(process.env.COLLECTOR_INTERVAL_SECONDS ?? 604800);
    console.log(`[daemon] Iniciando colector periódico (intervalo: ${intervalSec}s)`);
    const runCycle = async () => {
      try {
        await runAllCollectors();
        await runAnalyticalProcessor();
      } catch (err) {
        console.error("[daemon] Error en ciclo de ingesta:", err);
      }
    };
    await runCycle();
    setInterval(runCycle, intervalSec * 1000);
  } else {
    throw new Error(
      `Modo no reconocido: ${mode}. Usa 'collect', 'process', 'sync-web' o 'daemon'.`
    );
  }
}

main().catch((err: unknown) => {
  console.error("[error]", err);
  process.exitCode = 1;
});
