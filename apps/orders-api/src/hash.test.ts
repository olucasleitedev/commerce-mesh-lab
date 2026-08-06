import { describe, expect, it } from "vitest";
import { hashPayload } from "./hash.js";

describe("hashPayload", () => {
  it("is stable for the same payload", () => {
    const payload = { customerName: "Ana", productSku: "A", quantity: 1, amountCents: 100 };
    expect(hashPayload(payload)).toBe(hashPayload(payload));
  });

  it("changes when payload changes", () => {
    const a = { customerName: "Ana", productSku: "A", quantity: 1, amountCents: 100 };
    const b = { ...a, quantity: 2 };
    expect(hashPayload(a)).not.toBe(hashPayload(b));
  });
});
