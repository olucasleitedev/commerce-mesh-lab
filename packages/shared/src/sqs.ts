import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import type { OrderMessage } from "./types.js";
import { logger } from "./logger.js";

export function createSqsClient(): SQSClient {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  return new SQSClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
          },
        }
      : {}),
  });
}

export function getOrdersQueueUrl(): string {
  const url = process.env.SQS_ORDERS_QUEUE_URL;
  if (!url) {
    throw new Error("SQS_ORDERS_QUEUE_URL is required");
  }
  return url;
}

export async function publishOrderMessage(
  client: SQSClient,
  message: OrderMessage,
): Promise<string | undefined> {
  const queueUrl = getOrdersQueueUrl();
  const result = await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        orderId: {
          DataType: "String",
          StringValue: message.orderId,
        },
      },
    }),
  );
  logger.info("order message published", {
    orderId: message.orderId,
    messageId: result.MessageId,
  });
  return result.MessageId;
}

export async function receiveOrderMessages(
  client: SQSClient,
  maxMessages = 5,
  waitTimeSeconds = 10,
): Promise<Message[]> {
  const queueUrl = getOrdersQueueUrl();
  const result = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      VisibilityTimeout: 30,
      MessageAttributeNames: ["All"],
    }),
  );
  return result.Messages ?? [];
}

export async function deleteMessage(client: SQSClient, receiptHandle: string): Promise<void> {
  const queueUrl = getOrdersQueueUrl();
  await client.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    }),
  );
}

export function parseOrderMessage(body: string | undefined): OrderMessage {
  if (!body) {
    throw new Error("Empty SQS message body");
  }
  const parsed = JSON.parse(body) as OrderMessage;
  if (!parsed.orderId || !parsed.idempotencyKey) {
    throw new Error("Invalid OrderMessage payload");
  }
  return parsed;
}
