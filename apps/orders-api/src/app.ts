import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
  });

  await registerRoutes(app);
  return app;
}
