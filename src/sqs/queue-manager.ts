import { SqsClientWrapper, QueueInfo } from './client';
import { Logger } from '../utils/logger';
import { PluginConfig, QueueConfig } from '../config/defaults';

export interface QueueResource {
  logicalId: string;
  queueName: string;
  attributes: Record<string, string>;
  dlqName?: string;
}

export class QueueManager {
  private sqsClient: SqsClientWrapper;
  private logger: Logger;
  private config: PluginConfig;
  private createdQueues: Map<string, QueueInfo> = new Map();

  constructor(sqsClient: SqsClientWrapper, config: PluginConfig, logger: Logger) {
    this.sqsClient = sqsClient;
    this.config = config;
    this.logger = logger;
  }

  async createQueuesFromConfig(): Promise<void> {
    if (!this.config.autoCreate) {
      this.logger.debug('Queue auto-creation disabled');
      return;
    }

    this.logger.info('Creating queues from configuration...');

    for (const queueConfig of this.config.queues) {
      try {
        await this.createQueueFromConfig(queueConfig);
      } catch (error: any) {
        this.logger.error(`Failed to create queue ${queueConfig.queueName}: ${error.message}`);
      }
    }
  }

  async createQueuesFromCloudFormation(resources: any): Promise<void> {
    if (!this.config.autoCreate) {
      this.logger.debug('Queue auto-creation disabled');
      return;
    }

    const sqsResources = this.extractSqsResources(resources);
    if (sqsResources.length === 0) {
      this.logger.debug('No SQS queues found in CloudFormation resources');
      return;
    }

    this.logger.info(`Found ${sqsResources.length} SQS queue(s) in CloudFormation resources`);

    for (const resource of sqsResources) {
      try {
        await this.createQueueFromResource(resource);
      } catch (error: any) {
        this.logger.error(`Failed to create queue ${resource.queueName}: ${error.message}`);
      }
    }
  }

  private async createQueueFromConfig(queueConfig: QueueConfig): Promise<void> {
    const { queueName, dlq } = queueConfig;

    // Create DLQ first if enabled
    let dlqUrl: string | undefined;
    if (dlq?.enabled) {
      const dlqName = dlq.queueName || `${queueName}${this.config.deadLetterQueueSuffix}`;
      const dlqInfo = await this.sqsClient.createQueue(dlqName);
      dlqUrl = dlqInfo.queueUrl;
      this.createdQueues.set(dlqName, dlqInfo);
    }

    // Create main queue
    const attributes = this.buildQueueAttributes(queueConfig, dlqUrl);
    const queueInfo = await this.sqsClient.createQueue(queueName, attributes);
    this.createdQueues.set(queueName, queueInfo);

    this.logger.info(`Created queue: ${queueName} with handler: ${queueConfig.handler}`);
  }

  private async createQueueFromResource(resource: QueueResource): Promise<void> {
    const { queueName, attributes, dlqName } = resource;

    // Create DLQ first if specified
    let dlqUrl: string | undefined;
    if (dlqName) {
      const dlqInfo = await this.sqsClient.createQueue(dlqName);
      dlqUrl = dlqInfo.queueUrl;
      this.createdQueues.set(dlqName, dlqInfo);
    }

    // Update attributes with DLQ ARN if needed
    const finalAttributes = { ...attributes };
    if (dlqUrl && !finalAttributes.RedrivePolicy) {
      finalAttributes.RedrivePolicy = JSON.stringify({
        deadLetterTargetArn: this.buildQueueArn(dlqName!),
        maxReceiveCount: this.config.maxReceiveCount,
      });
    }

    // Create main queue
    const queueInfo = await this.sqsClient.createQueue(queueName, finalAttributes);
    this.createdQueues.set(queueName, queueInfo);

    this.logger.info(`Created queue from CloudFormation: ${queueName}`);
  }

  private buildQueueAttributes(queueConfig: QueueConfig, dlqUrl?: string): Record<string, string> {
    const attributes: Record<string, string> = {
      VisibilityTimeout: (queueConfig.visibilityTimeout || this.config.visibilityTimeout).toString(),
      ReceiveMessageWaitTimeSeconds: (queueConfig.waitTimeSeconds || this.config.waitTimeSeconds).toString(),
    };

    if (dlqUrl && queueConfig.dlq?.enabled) {
      attributes.RedrivePolicy = JSON.stringify({
        deadLetterTargetArn: this.buildQueueArn(queueConfig.dlq.queueName || `${queueConfig.queueName}${this.config.deadLetterQueueSuffix}`),
        maxReceiveCount: queueConfig.dlq.maxReceiveCount || this.config.maxReceiveCount,
      });
    }

    return attributes;
  }

  private extractSqsResources(resources: any): QueueResource[] {
    const sqsResources: QueueResource[] = [];

    if (!resources || typeof resources !== 'object') {
      return sqsResources;
    }

    for (const [logicalId, resource] of Object.entries(resources)) {
      if (this.isSqsQueue(resource)) {
        const queueResource = this.parseQueueResource(logicalId, resource as any);
        if (queueResource) {
          sqsResources.push(queueResource);
        }
      }
    }

    return sqsResources;
  }

  private isSqsQueue(resource: any): boolean {
    return resource?.Type === 'AWS::SQS::Queue';
  }

  private parseQueueResource(logicalId: string, resource: any): QueueResource | null {
    try {
      const properties = resource.Properties || {};
      const queueName = properties.QueueName || logicalId;
      const attributes: Record<string, string> = {};

      // Map CloudFormation properties to SQS attributes
      if (properties.VisibilityTimeout !== undefined) {
        attributes.VisibilityTimeout = properties.VisibilityTimeout.toString();
      }
      if (properties.ReceiveMessageWaitTimeSeconds !== undefined) {
        attributes.ReceiveMessageWaitTimeSeconds = properties.ReceiveMessageWaitTimeSeconds.toString();
      }
      if (properties.MessageRetentionPeriod !== undefined) {
        attributes.MessageRetentionPeriod = properties.MessageRetentionPeriod.toString();
      }
      if (properties.DelaySeconds !== undefined) {
        attributes.DelaySeconds = properties.DelaySeconds.toString();
      }

      // Handle redrive policy
      let dlqName: string | undefined;
      if (properties.RedrivePolicy) {
        attributes.RedrivePolicy = JSON.stringify(properties.RedrivePolicy);
        
        // Try to extract DLQ name from the policy
        if (properties.RedrivePolicy.deadLetterTargetArn) {
          const arnParts = properties.RedrivePolicy.deadLetterTargetArn.split(':');
          dlqName = arnParts[arnParts.length - 1];
        }
      }

      return {
        logicalId,
        queueName,
        attributes,
        dlqName,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse SQS resource ${logicalId}:`, error);
      return null;
    }
  }

  private buildQueueArn(queueName: string): string {
    // LocalStack uses a simplified ARN format
    return `arn:aws:sqs:${this.config.region}:000000000000:${queueName}`;
  }

  getCreatedQueues(): Map<string, QueueInfo> {
    return this.createdQueues;
  }

  async getQueueInfo(queueName: string): Promise<QueueInfo | undefined> {
    try {
      if (this.createdQueues.has(queueName)) {
        return this.createdQueues.get(queueName);
      }

      const queueInfo = await this.sqsClient.getQueueInfo(queueName);
      this.createdQueues.set(queueName, queueInfo);
      return queueInfo;
    } catch (error: any) {
      this.logger.debug(`Queue ${queueName} not found: ${error.message}`);
      return undefined;
    }
  }
}