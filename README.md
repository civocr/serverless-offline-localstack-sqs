# Serverless Offline LocalStack SQS

[![CI](https://github.com/civocr/serverless-offline-localstack-sqs/workflows/CI/badge.svg)](https://github.com/civocr/serverless-offline-localstack-sqs/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/serverless-offline-localstack-sqs.svg)](https://badge.fury.io/js/serverless-offline-localstack-sqs)
[![downloads](https://img.shields.io/npm/dm/serverless-offline-localstack-sqs.svg)](https://www.npmjs.com/package/serverless-offline-localstack-sqs)
[![license](https://img.shields.io/npm/l/serverless-offline-localstack-sqs.svg)](https://github.com/civocr/serverless-offline-localstack-sqs/blob/main/LICENSE)
[![codecov](https://codecov.io/gh/civocr/serverless-offline-localstack-sqs/branch/main/graph/badge.svg)](https://codecov.io/gh/civocr/serverless-offline-localstack-sqs)
[![node](https://img.shields.io/node/v/serverless-offline-localstack-sqs.svg)](https://www.npmjs.com/package/serverless-offline-localstack-sqs)
[![CodeQL](https://github.com/civocr/serverless-offline-localstack-sqs/actions/workflows/codeql.yml/badge.svg)](https://github.com/civocr/serverless-offline-localstack-sqs/actions/workflows/codeql.yml)

A Serverless Framework plugin that enables local SQS integration with LocalStack for development and testing. This plugin automatically polls SQS queues and invokes your Lambda handlers locally, providing a seamless offline development experience.

## Features

- ✅ **Serverless Framework v3 & v4 Support** - Compatible with both major versions
- ✅ **LocalStack Integration** - Works seamlessly with LocalStack SQS service
- ✅ **Docker Auto-Detection** - Automatically detects Docker environment and LocalStack endpoint
- ✅ **Auto-Queue Creation** - Creates queues from CloudFormation resources and function events
- ✅ **Message Polling** - Configurable polling intervals and concurrent processing
- ✅ **Dead Letter Queue (DLQ) Support** - Automatic retry and DLQ handling
- ✅ **Batch Processing** - Support for SQS batch message processing
- ✅ **Hot Reloading** - Automatic handler cache invalidation for development
- ✅ **TypeScript Support** - Written in TypeScript with full type definitions
- ✅ **Comprehensive Logging** - Debug-friendly logging with configurable levels

## Installation

```bash
npm install --save-dev serverless-offline-localstack-sqs
```

## Quick Start

1. **Add the plugin to your `serverless.yml`**:

```yaml
plugins:
  - serverless-offline
  - serverless-offline-localstack-sqs

custom:
  serverless-offline-localstack-sqs:
    enabled: true
    endpoint: http://localhost:4566  # LocalStack endpoint
    autoCreate: true
    debug: true
```

2. **Start LocalStack**:

```bash
docker run --rm -p 4566:4566 localstack/localstack
```

3. **Start your serverless application**:

```bash
serverless offline start
```

The plugin will automatically:
- Detect SQS events in your function definitions
- Create queues in LocalStack
- Start polling for messages
- Invoke your handlers when messages arrive

## Configuration

### Basic Configuration

```yaml
custom:
  serverless-offline-localstack-sqs:
    enabled: true                    # Enable/disable the plugin
    endpoint: http://localhost:4566  # LocalStack endpoint (auto-detected if omitted)
    region: us-east-1               # AWS region
    accessKeyId: test               # LocalStack access key
    secretAccessKey: test           # LocalStack secret key
    autoCreate: true                # Auto-create queues from CloudFormation
    pollInterval: 1000              # Polling interval in milliseconds
    maxConcurrentPolls: 3           # Max concurrent polling operations
    visibilityTimeout: 30           # Default visibility timeout
    waitTimeSeconds: 20             # Long polling wait time
    maxReceiveCount: 3              # Max retries before DLQ
    deadLetterQueueSuffix: '-dlq'   # DLQ naming suffix
    debug: false                    # Enable debug logging
    skipCacheInvalidation: false    # Skip handler cache clearing
    lambdaTimeout: 30000           # Handler timeout in milliseconds
```

### Queue Configuration

You can manually configure queues or let the plugin auto-detect them from your function events:

```yaml
custom:
  serverless-offline-localstack-sqs:
    queues:
      - queueName: my-queue
        handler: handlers/processor.main
        enabled: true
        batchSize: 10
        maxConcurrentPolls: 2
        visibilityTimeout: 60
        waitTimeSeconds: 20
        dlq:
          enabled: true
          maxReceiveCount: 5
          queueName: my-queue-dlq  # Optional: custom DLQ name
```

### Function Events (Auto-Detection)

The plugin automatically detects SQS events from your function definitions:

```yaml
functions:
  processMessages:
    handler: handlers/processor.main
    events:
      - sqs:
          arn: arn:aws:sqs:us-east-1:000000000000:my-queue
          batchSize: 10
      - sqs:
          queueName: another-queue
          batchSize: 1
```

### CloudFormation Resources

Queues defined in CloudFormation resources are automatically created:

```yaml
resources:
  Resources:
    MyQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: my-queue
        VisibilityTimeout: 30
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt MyDLQ.Arn
          maxReceiveCount: 3
    
    MyDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: my-queue-dlq
```

## Usage Examples

### Basic Handler

```javascript
// handlers/processor.js
exports.main = async (event, context) => {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    console.log('Processing message:', messageBody);
    
    // Your processing logic here
    await processMessage(messageBody);
  }
  
  return { statusCode: 200 };
};
```

### Error Handling with DLQ

```javascript
// handlers/processor.js
exports.main = async (event, context) => {
  for (const record of event.Records) {
    try {
      const messageBody = JSON.parse(record.body);
      await processMessage(messageBody);
    } catch (error) {
      console.error('Processing failed:', error);
      // Throw error to trigger retry/DLQ logic
      throw error;
    }
  }
};
```

### Sending Test Messages

```javascript
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

await client.send(new SendMessageCommand({
  QueueUrl: 'http://localhost:4566/000000000000/my-queue',
  MessageBody: JSON.stringify({ id: 1, message: 'Hello World!' })
}));
```

## Commands

The plugin provides custom Serverless commands:

```bash
# Start SQS polling only
serverless sqs-offline start

# Stop SQS polling
serverless sqs-offline stop
```

## Docker Integration

The plugin automatically detects your Docker environment:

- **Docker Desktop**: Uses `localhost:4566`
- **Running in Container**: Uses `localstack:4566` or `host.docker.internal:4566`
- **Custom Networks**: Set `LOCALSTACK_HOST` environment variable

### Docker Compose Example

```yaml
version: '3.8'
services:
  localstack:
    image: localstack/localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=sqs
      - DEBUG=1
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Troubleshooting

### Plugin Not Starting
- Ensure LocalStack is running: `docker ps | grep localstack`
- Check plugin configuration in `serverless.yml`
- Enable debug logging: `debug: true`

### Messages Not Processing
- Verify queue names match between configuration and message sending
- Check handler paths are correct relative to service root
- Ensure LocalStack SQS is accessible on the configured endpoint

### Handler Errors
- Check handler function exports match configuration
- Verify handler file extensions (`.js`, `.ts`, `.mjs`)
- Enable debug logging to see detailed error messages

### Docker Connectivity
- Ensure port 4566 is not blocked by firewall
- For Docker Desktop on Windows/Mac, try `host.docker.internal` instead of `localhost`
- Set `LOCALSTACK_HOST` environment variable if using custom networking

## Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/civocr/serverless-offline-localstack-sqs.git
cd serverless-offline-localstack-sqs

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

### Testing with Examples

```bash
# Test with the simple test app
cd test-app
npm install
npm run dev

# Test with the examples
cd examples  
npm install
npm run dev
```

### Git Hooks

This project uses Husky for Git hooks to maintain code quality:

- **Pre-commit hook**: Runs `lint-staged` on staged files
  - Automatically fixes ESLint issues where possible
  - Prevents commits with linting errors
  - Ensures consistent code style

```bash
# The pre-commit hook will run automatically, but you can also run manually:
npx lint-staged

# To bypass the hook (not recommended):
git commit --no-verify -m "message"
```

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow** (`ci.yml`): Runs on every push and PR
  - Tests across Node.js 18, 20, and 22
  - Runs linting and unit tests
  - Integration testing with LocalStack
  - Code coverage reporting to Codecov

- **Release Workflow** (`release.yml`): Automated releases
  - Automatic version bumping based on commit messages
  - GitHub release creation with changelog
  - NPM publishing with proper permissions
  - Manual release triggers with version selection

- **CodeQL Workflow** (`codeql.yml`): Security analysis
  - Weekly security scans
  - Code quality and vulnerability detection

### Release Process

The plugin supports both automatic and manual releases:

**Automatic Releases:**
- Push to `main` branch triggers automatic patch releases
- Commit messages determine version bump:
  - `feat:` or `feature:` → minor version
  - `BREAKING:` or `major:` → major version  
  - Default → patch version

**Manual Releases:**
- Go to Actions → Release workflow → Run workflow
- Select release type: patch, minor, major, or prerelease

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the full test suite: `npm test`
6. Run linting: `npm run lint`
7. Commit with conventional commit messages
8. Submit a pull request

## License

MIT

## Changelog

### v1.0.0
- Initial release
- Support for Serverless Framework v3 and v4
- LocalStack integration with Docker auto-detection
- Automatic queue creation from CloudFormation and function events
- Message polling with retry and DLQ support
- TypeScript implementation with full type definitions