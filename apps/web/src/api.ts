import type { CreateOrderPayload, Order } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function listOrders(): Promise<Order[]> {
  const response = await fetch(`${API_URL}/orders`);
  if (!response.ok) {
    throw new Error(`Failed to list orders (${response.status})`);
  }
  const json = (await response.json()) as { data: Order[] };
  return json.data;
}

export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey: string,
): Promise<{ order: Order; replayed: boolean }> {
  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as {
    data?: Order;
    replayed?: boolean;
    error?: string;
  };

  if (!response.ok || !json.data) {
    throw new Error(json.error ?? `Failed to create order (${response.status})`);
  }

  return { order: json.data, replayed: Boolean(json.replayed) };
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
