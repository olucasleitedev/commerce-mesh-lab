import { initTracing, logger } from "@commerce-mesh/shared";
import { buildApp } from "./app.js";
import { closePool } from "./db.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  await initTracing("commerce-mesh-orders-api");

  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info("shutting down", { signal });
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port, host });
  logger.info("orders-api listening", { port, host });
}

main().catch((error: unknown) => {
  logger.error("orders-api failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
