import {
  createSqsClient,
  logger,
  publishOrderMessage,
  type CreateOrderInput,
  type Order,
} from "@commerce-mesh/shared";
import type { Pool } from "pg";
import { hashPayload } from "./hash.js";
import {
  findIdempotency,
  getOrderById,
  insertOrder,
  insertOutbox,
  listOrders,
  saveIdempotency,
} from "./orders.repository.js";

export type CreateOrderResult =
  | { kind: "created"; status: number; order: Order }
  | { kind: "replay"; status: number; order: Order }
  | { kind: "conflict"; status: number; message: string };

const sqs = createSqsClient();

export async function createOrder(
  pool: Pool,
  idempotencyKey: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const requestHash = hashPayload(input);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await findIdempotency(client, idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) {
        await client.query("ROLLBACK");
        return {
          kind: "conflict",
          status: 409,
          message: "Idempotency-Key reused with a different payload",
        };
      }
      await client.query("ROLLBACK");
      logger.info("idempotent replay", { idempotencyKey, orderId: existing.order_id });
      return {
        kind: "replay",
        status: existing.response_status,
        order: existing.response_body,
      };
    }

    const order = await insertOrder(client, input);
    await saveIdempotency(client, idempotencyKey, requestHash, order, 201);
    await insertOutbox(client, order.id, {
      orderId: order.id,
      idempotencyKey,
    });

    await client.query("COMMIT");

    await publishOrderMessage(sqs, {
      orderId: order.id,
      idempotencyKey,
      enqueuedAt: new Date().toISOString(),
    });

    logger.info("order created", { orderId: order.id, idempotencyKey });
    return { kind: "created", status: 201, order };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function fetchOrders(pool: Pool): Promise<Order[]> {
  const client = await pool.connect();
  try {
    return await listOrders(client);
  } finally {
    client.release();
  }
}

export async function fetchOrder(pool: Pool, id: string): Promise<Order | null> {
  const client = await pool.connect();
  try {
    return await getOrderById(client, id);
  } finally {
    client.release();
  }
}
