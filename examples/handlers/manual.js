/**
 * Example handler for manually configured queue
 */
exports.handler = async (event, context) => {
  console.log('Manual handler triggered:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    try {
      console.log('Processing manual message:', record.body);
      
      // Simulate processing
      await processMessage(record.body);
      
      console.log('Manual message processed successfully');
    } catch (error) {
      console.error('Error processing manual message:', error);
      throw error;
    }
  }
  
  return { success: true };
};

async function processMessage(body) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('Manual processing completed');
}