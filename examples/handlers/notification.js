/**
 * Example SQS handler for sending notifications
 */
exports.send = async (event, context) => {
  console.log('Processing notification event:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    try {
      const messageBody = JSON.parse(record.body);
      console.log('Sending notification:', messageBody);
      
      // Simulate notification sending
      await sendNotification(messageBody);
      
      console.log(`Successfully sent notification: ${messageBody.type || 'unknown'}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Sent ${event.Records.length} notification(s)`,
      sentAt: new Date().toISOString(),
    }),
  };
};

async function sendNotification(notification) {
  // Simulate async notification sending
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (!notification.recipient) {
    throw new Error('Notification recipient is required');
  }
  
  console.log(`Notification sent to ${notification.recipient}: ${notification.message}`);
}