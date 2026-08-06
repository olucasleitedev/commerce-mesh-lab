#!/bin/bash
set -euo pipefail

echo "Creating SQS queues..."

awslocal sqs create-queue \
  --queue-name commerce-mesh-orders-dlq

DLQ_URL=$(awslocal sqs get-queue-url --queue-name commerce-mesh-orders-dlq --query QueueUrl --output text)
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --query Attributes.QueueArn --output text)

awslocal sqs create-queue \
  --queue-name commerce-mesh-orders \
  --attributes "{
    \"VisibilityTimeout\": \"30\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }"

echo "SQS queues ready:"
awslocal sqs list-queues
