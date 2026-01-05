export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Not implemented yet',
      event: event
    })
  };
};
