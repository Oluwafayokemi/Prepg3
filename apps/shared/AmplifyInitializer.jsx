// apps/shared/components/AmplifyInitializer.jsx
'use client';

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { awsConfig } from './config/aws-exports';

export default function AmplifyInitializer({ children }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('🔧 Initializing Amplify...');
    console.log('Config:', awsConfig);

    try {
      if (!awsConfig?.Auth?.Cognito?.userPoolId) {
        throw new Error('❌ UserPool ID missing in config');
      }

      if (!awsConfig?.Auth?.Cognito?.userPoolClientId) {
        throw new Error('❌ Client ID missing in config');
      }

      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: awsConfig.Auth.Cognito.userPoolId,
            userPoolClientId: awsConfig.Auth.Cognito.userPoolClientId,
            identityPoolId: awsConfig.Auth.Cognito.identityPoolId,
            loginWith: {
              email: true,
            },
          }
        },
        API: {
          GraphQL: {
            endpoint: awsConfig.API?.GraphQL?.endpoint,
            region: awsConfig.API?.GraphQL?.region || 'eu-north-1',
            defaultAuthMode: 'userPool',
          }
        }
      }, {
        ssr: false  // Set to false for client-side only
      });

      console.log('✅ Amplify initialized successfully!');
      console.log('UserPoolId:', awsConfig.Auth.Cognito.userPoolId);
      console.log('ClientId:', awsConfig.Auth.Cognito.userPoolClientId);
      
      setInitialized(true);

    } catch (error) {
      console.error('❌ Failed to initialize Amplify:', error);
      console.error('Config:', awsConfig);
    }
  }, []);

  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
          <p style={{ color: '#6b7280' }}>Initializing...</p>
        </div>
      </div>
    );
  }

  return children;
}