import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@commerce-mesh/shared";

const {
  findIdempotency,
  insertOrder,
  saveIdempotency,
  insertOutbox,
  publishOrderMessage,
} = vi.hoisted(() => ({
  findIdempotency: vi.fn(),
  insertOrder: vi.fn(),
  saveIdempotency: vi.fn(),
  insertOutbox: vi.fn(),
  publishOrderMessage: vi.fn(),
}));

vi.mock("./orders.repository.js", () => ({
  findIdempotency,
  insertOrder,
  saveIdempotency,
  insertOutbox,
  listOrders: vi.fn(),
  getOrderById: vi.fn(),
}));

vi.mock("@commerce-mesh/shared", async () => {
  const actual = await vi.importActual<typeof import("@commerce-mesh/shared")>(
    "@commerce-mesh/shared",
  );
  return {
    ...actual,
    createSqsClient: () => ({}),
    publishOrderMessage,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

import { createOrder } from "./orders.service.js";

function makePool() {
  const client = {
    query: vi.fn(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  return {
    connect: vi.fn(async () => client),
    client,
  };
}

const sampleOrder: Order = {
  id: "11111111-1111-1111-1111-111111111111",
  customerName: "Ana",
  productSku: "SKU-1",
  quantity: 1,
  amountCents: 1000,
  status: "PENDING",
  failureReason: null,
  processedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const input = {
  customerName: "Ana",
  productSku: "SKU-1",
  quantity: 1,
  amountCents: 1000,
};

describe("createOrder idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new order when key is unseen", async () => {
    const { connect, client } = makePool();
    findIdempotency.mockResolvedValueOnce(null);
    insertOrder.mockResolvedValueOnce(sampleOrder);
    publishOrderMessage.mockResolvedValueOnce("msg-1");

    const result = await createOrder({ connect } as never, "key-1", input);

    expect(result).toEqual({ kind: "created", status: 201, order: sampleOrder });
    expect(saveIdempotency).toHaveBeenCalledOnce();
    expect(insertOutbox).toHaveBeenCalledOnce();
    expect(publishOrderMessage).toHaveBeenCalledOnce();
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("replays the original response for the same key and payload", async () => {
    const { connect } = makePool();
    const { hashPayload } = await import("./hash.js");
    findIdempotency.mockResolvedValueOnce({
      key: "key-1",
      request_hash: hashPayload(input),
      order_id: sampleOrder.id,
      response_status: 201,
      response_body: sampleOrder,
    });

    const result = await createOrder({ connect } as never, "key-1", input);

    expect(result).toEqual({ kind: "replay", status: 201, order: sampleOrder });
    expect(insertOrder).not.toHaveBeenCalled();
    expect(publishOrderMessage).not.toHaveBeenCalled();
  });

  it("conflicts when the same key is reused with a different payload", async () => {
    const { connect } = makePool();
    findIdempotency.mockResolvedValueOnce({
      key: "key-1",
      request_hash: "different-hash",
      order_id: sampleOrder.id,
      response_status: 201,
      response_body: sampleOrder,
    });

    const result = await createOrder({ connect } as never, "key-1", input);

    expect(result).toEqual({
      kind: "conflict",
      status: 409,
      message: "Idempotency-Key reused with a different payload",
    });
    expect(insertOrder).not.toHaveBeenCalled();
  });
});
