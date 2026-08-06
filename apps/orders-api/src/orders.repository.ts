import type { PoolClient } from "pg";
import type { CreateOrderInput, Order, OrderStatus } from "@commerce-mesh/shared";

interface OrderRow {
  id: string;
  customer_name: string;
  product_sku: string;
  quantity: number;
  amount_cents: number;
  status: OrderStatus;
  failure_reason: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface IdempotencyRow {
  key: string;
  request_hash: string;
  order_id: string;
  response_status: number;
  response_body: Order;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    productSku: row.product_sku,
    quantity: row.quantity,
    amountCents: row.amount_cents,
    status: row.status,
    failureReason: row.failure_reason,
    processedAt: row.processed_at ? row.processed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findIdempotency(
  client: PoolClient,
  key: string,
): Promise<IdempotencyRow | null> {
  const result = await client.query<IdempotencyRow>(
    `SELECT key, request_hash, order_id, response_status, response_body
     FROM idempotency_keys
     WHERE key = $1`,
    [key],
  );
  return result.rows[0] ?? null;
}

export async function insertOrder(
  client: PoolClient,
  input: CreateOrderInput,
): Promise<Order> {
  const result = await client.query<OrderRow>(
    `INSERT INTO orders (customer_name, product_sku, quantity, amount_cents, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING *`,
    [input.customerName, input.productSku, input.quantity, input.amountCents],
  );
  return mapOrder(result.rows[0]);
}

export async function saveIdempotency(
  client: PoolClient,
  key: string,
  requestHash: string,
  order: Order,
  responseStatus: number,
): Promise<void> {
  await client.query(
    `INSERT INTO idempotency_keys (key, request_hash, order_id, response_status, response_body)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [key, requestHash, order.id, responseStatus, JSON.stringify(order)],
  );
}

export async function insertOutbox(
  client: PoolClient,
  orderId: string,
  payload: unknown,
): Promise<void> {
  await client.query(
    `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
     VALUES ('order', $1, 'order.created', $2::jsonb)`,
    [orderId, JSON.stringify(payload)],
  );
}

export async function listOrders(client: PoolClient, limit = 50): Promise<Order[]> {
  const result = await client.query<OrderRow>(
    `SELECT * FROM orders ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapOrder);
}

export async function getOrderById(client: PoolClient, id: string): Promise<Order | null> {
  const result = await client.query<OrderRow>(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (!result.rows[0]) return null;
  return mapOrder(result.rows[0]);
}
