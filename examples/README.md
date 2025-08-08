# Serverless Offline LocalStack SQS - Example

This example demonstrates how to use the `serverless-offline-localstack-sqs` plugin with a Serverless Framework application.

## Prerequisites

1. **Docker** - For running LocalStack
2. **Node.js** - Version 14 or higher
3. **Serverless Framework** - Version 3 or 4

## Quick Start

1. **Start LocalStack**:
   ```bash
   npm run localstack:start
   ```
   Or manually:
   ```bash
   docker run --rm -p 4566:4566 localstack/localstack
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the offline service**:
   ```bash
   npm start
   ```

This will start both the HTTP API and SQS polling.

## Testing SQS Integration

### Send test messages to LocalStack SQS:

```bash
# Install AWS CLI or use AWS SDK
aws --endpoint-url=http://localhost:4566 sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-queue \
  --message-body '{"orderId": "12345", "amount": 99.99, "customerId": "cust123"}'

aws --endpoint-url=http://localhost:4566 sqs send-message \
  --queue-url http://localhost:4566/000000000000/notification-queue \
  --message-body '{"type": "order_confirmation", "recipient": "user@example.com", "message": "Your order has been confirmed"}'
```

### Or use the AWS SDK in Node.js:

```javascript
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

// Send order message
await client.send(new SendMessageCommand({
  QueueUrl: 'http://localhost:4566/000000000000/order-queue',
  MessageBody: JSON.stringify({
    orderId: '12345',
    amount: 99.99,
    customerId: 'cust123'
  })
}));
```

## Configuration Options

The plugin configuration is in `serverless.yml` under `custom.serverless-offline-localstack-sqs`:

```yaml
custom:
  serverless-offline-localstack-sqs:
    enabled: true              # Enable/disable the plugin
    endpoint: http://localhost:4566  # LocalStack endpoint
    region: us-east-1          # AWS region
    autoCreate: true           # Auto-create queues
    pollInterval: 1000         # Polling interval (ms)
    debug: true               # Enable debug logging
    queues:                   # Manual queue configuration
      - queueName: manual-queue
        handler: handlers/manual.handler
        batchSize: 1
        dlq:
          enabled: true
          maxReceiveCount: 3
```

## Features Demonstrated

1. **Auto-detection of SQS events** from function definitions
2. **CloudFormation resource parsing** for queue creation
3. **Dead Letter Queue (DLQ)** handling
4. **Batch message processing**
5. **Error handling and retries**
6. **Manual queue configuration**

## Project Structure

```
examples/
├── serverless.yml          # Serverless configuration
├── package.json           # Dependencies and scripts
├── handlers/              # Lambda handlers
│   ├── order.js          # Order processing handler
│   ├── notification.js   # Notification handler
│   ├── manual.js         # Manual queue handler
│   └── api.js           # HTTP API handler
└── README.md            # This file
```

## Commands

- `npm start` - Start serverless offline with SQS polling
- `npm run sqs:start` - Start only SQS polling (without HTTP endpoints)
- `npm run localstack:start` - Start LocalStack in Docker

## Troubleshooting

### Plugin not starting
- Ensure LocalStack is running on port 4566
- Check plugin configuration in `serverless.yml`
- Enable debug mode: `debug: true`

### Messages not processing
- Verify queue names match between configuration and message sending
- Check handler paths are correct
- Look for error messages in console output

### Docker connectivity issues
- Ensure Docker is running
- Check port 4566 is not being used by other services
- Try using `host.docker.internal` instead of `localhost` on some systems