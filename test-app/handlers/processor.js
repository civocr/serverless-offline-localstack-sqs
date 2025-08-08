exports.handler = async (event) => {
  console.log('🔄 Processing SQS events:', event.Records.length, 'records');
  
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    console.log('📨 Processing message:', message);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ Message processed successfully');
  }
  
  return { statusCode: 200 };
};