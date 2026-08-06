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

export interface CreateOrderPayload {
  customerName: string;
  productSku: string;
  quantity: number;
  amountCents: number;
}
