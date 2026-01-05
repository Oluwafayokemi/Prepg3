// apps/shared/lib/amplify-config.ts

import { Amplify } from 'aws-amplify';
import { awsConfig } from '@shared/config/aws-exports';

// Configure Amplify once
let isConfigured = false;

export function configureAmplify() {
  if (isConfigured) return;
  
  Amplify.configure({
    Auth: awsConfig.Auth,
    API: {
      GraphQL: awsConfig.API.GraphQL,
    },
  }, { ssr: true });
  
  isConfigured = true;
  console.log('✅ Amplify configured');
}