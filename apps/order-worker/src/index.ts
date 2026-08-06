import {
  createSqsClient,
  deleteMessage,
  logger,
  parseOrderMessage,
  receiveOrderMessages,
} from "@commerce-mesh/shared";
import { closePool, getPool } from "./db.js";
import { processOrder } from "./processor.js";

const sqs = createSqsClient();
let running = true;

async function pollOnce(): Promise<void> {
  const messages = await receiveOrderMessages(sqs);
  if (messages.length === 0) return;

  for (const message of messages) {
    if (!message.ReceiptHandle) continue;

    try {
      const payload = parseOrderMessage(message.Body);
      await processOrder(getPool(), payload);
      await deleteMessage(sqs, message.ReceiptHandle);
    } catch (error) {
      logger.error("failed to process message", {
        messageId: message.MessageId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Leave message for retry / DLQ via visibility timeout + maxReceiveCount
    }
  }
}

async function loop(): Promise<void> {
  logger.info("order-worker started");
  while (running) {
    try {
      await pollOnce();
    } catch (error) {
      logger.error("poll loop error", {
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info("shutting down worker", { signal });
  running = false;
  await closePool();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

loop().catch((error: unknown) => {
  logger.error("worker crashed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
