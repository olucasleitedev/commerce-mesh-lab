import { logger, type OrderMessage } from "@commerce-mesh/shared";
import type { Pool } from "pg";

/**
 * Claim + process with optimistic lock on status.
 * At-least-once delivery from SQS; exactly-once effect via PENDING -> PROCESSING.
 */
export async function processOrder(pool: Pool, message: OrderMessage): Promise<"done" | "skip"> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const claim = await client.query<{ id: string; quantity: number }>(
      `UPDATE orders
       SET status = 'PROCESSING', updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING id, quantity`,
      [message.orderId],
    );

    if (claim.rowCount === 0) {
      await client.query("ROLLBACK");
      logger.info("order already claimed or finished", {
        orderId: message.orderId,
        idempotencyKey: message.idempotencyKey,
      });
      return "skip";
    }

    // Simulated business rule: quantity > 100 fails
    const quantity = claim.rows[0].quantity;
    if (quantity > 100) {
      await client.query(
        `UPDATE orders
         SET status = 'FAILED',
             failure_reason = $2,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [message.orderId, "Quantity exceeds fulfillment limit"],
      );
      await client.query("COMMIT");
      logger.warn("order failed business rule", { orderId: message.orderId });
      return "done";
    }

    // Simulated processing latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    await client.query(
      `UPDATE orders
       SET status = 'CONFIRMED',
           processed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [message.orderId],
    );

    await client.query(
      `UPDATE outbox_events
       SET published_at = NOW()
       WHERE aggregate_id = $1 AND published_at IS NULL`,
      [message.orderId],
    );

    await client.query("COMMIT");
    logger.info("order confirmed", {
      orderId: message.orderId,
      idempotencyKey: message.idempotencyKey,
    });
    return "done";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
