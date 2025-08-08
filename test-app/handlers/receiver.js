const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

exports.handler = async (event) => {
  console.log('🎯 Webhook received:', JSON.parse(event.body || '{}'));
  
  const command = new SendMessageCommand({
    QueueUrl: 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/webhook-events-local',
    MessageBody: event.body || '{}'
  });
  
  await sqs.send(command);
  console.log('✅ Message sent to queue');
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};