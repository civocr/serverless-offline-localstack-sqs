/**
 * Example HTTP handler (not related to SQS)
 */
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello from API endpoint',
      timestamp: new Date().toISOString(),
    }),
  };
};