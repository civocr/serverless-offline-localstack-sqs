/**
 * Example SQS handler for processing orders
 */
exports.process = async (event, context) => {
  console.log('Processing order event:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    try {
      const messageBody = JSON.parse(record.body);
      console.log('Processing order:', messageBody);
      
      // Simulate order processing
      await processOrder(messageBody);
      
      console.log(`Successfully processed order: ${messageBody.orderId || 'unknown'}`);
    } catch (error) {
      console.error('Error processing order record:', error);
      
      // Re-throw error to trigger retry/DLQ logic
      throw error;
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Processed ${event.Records.length} order(s)`,
      processedAt: new Date().toISOString(),
    }),
  };
};

async function processOrder(order) {
  // Simulate async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!order.orderId) {
    throw new Error('Order ID is required');
  }
  
  // Simulate occasional failures for testing DLQ behavior
  if (Math.random() < 0.1) {
    throw new Error('Simulated processing failure');
  }
  
  console.log(`Order ${order.orderId} processed successfully`);
}