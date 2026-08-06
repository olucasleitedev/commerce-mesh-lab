import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "./db.js";
import { createOrder, fetchOrder, fetchOrders } from "./orders.service.js";

const createOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  productSku: z.string().min(1).max(100),
  quantity: z.number().int().positive().max(1000),
  amountCents: z.number().int().nonnegative(),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ ok: true, service: "orders-api" }));

  app.get("/orders", async (_request, reply) => {
    const orders = await fetchOrders(getPool());
    return reply.send({ data: orders });
  });

  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const order = await fetchOrder(getPool(), request.params.id);
    if (!order) {
      return reply.status(404).send({ error: "Order not found" });
    }
    return reply.send({ data: order });
  });

  app.post("/orders", async (request, reply) => {
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
      return reply.status(400).send({
        error: "Header Idempotency-Key is required",
      });
    }

    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    const result = await createOrder(getPool(), idempotencyKey.trim(), parsed.data);

    if (result.kind === "conflict") {
      return reply.status(result.status).send({ error: result.message });
    }

    return reply.status(result.status).send({
      data: result.order,
      replayed: result.kind === "replay",
    });
  });
}
