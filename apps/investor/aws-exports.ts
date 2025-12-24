export default {
  Auth: {
    region: 'eu-west-2',
    userPoolId: 'eu-west-2_abc123', // From CDK output
    userPoolWebClientId: 'xyz789',   // From CDK output
  },
  API: {
    GraphQL: {
      endpoint: 'https://abc123.appsync-api.eu-west-2.amazonaws.com/graphql',
      region: 'eu-west-2',
      defaultAuthMode: 'AMAZON_COGNITO_USER_POOLS',
    },
  },
  Storage: {
    region: 'eu-west-2',
    bucket: 'prepg3-documents-123456789',
  },
};