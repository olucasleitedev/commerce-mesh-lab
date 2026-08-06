export type OrderStatus = "PENDING" | "PROCESSING" | "CONFIRMED" | "FAILED";

export interface Order {
  id: string;
  customerName: string;
  productSku: string;
  quantity: number;
  amountCents: number;
  status: OrderStatus;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerName: string;
  productSku: string;
  quantity: number;
  amountCents: number;
}

export interface OrderMessage {
  orderId: string;
  idempotencyKey: string;
  enqueuedAt: string;
}
