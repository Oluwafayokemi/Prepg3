// apps/shared/components/AmplifyInitializer.jsx
'use client';

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { awsConfig } from '../config/aws-exports';

let isConfigured = false;

export default function AmplifyInitializer({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isConfigured) {
      setInitialized(true);
      return;
    }

    initializeAmplify();
  }, []);

  const initializeAmplify = async () => {
    console.log('🔧 Initializing Amplify...');
    console.log('📋 Config:', awsConfig); // ✅ Debug log

    try {
      if (!awsConfig?.Auth?.Cognito?.userPoolId) {
        throw new Error('UserPool ID missing in aws-exports.js');
      }

      if (!awsConfig?.Auth?.Cognito?.userPoolClientId) {
        throw new Error('Client ID missing in aws-exports.js');
      }

      if (!awsConfig?.API?.GraphQL?.endpoint) {
        throw new Error('GraphQL endpoint missing in aws-exports.js');
      }

      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: awsConfig.Auth.Cognito.userPoolId,
            userPoolClientId: awsConfig.Auth.Cognito.userPoolClientId,
            loginWith: {
              email: true,
            },
          }
        },
        API: {
          GraphQL: {
            endpoint: awsConfig.API.GraphQL.endpoint,
            region: awsConfig.API.GraphQL.region || 'eu-north-1',
            defaultAuthMode: 'userPool',
          }
        }
      }, {
        ssr: true // 
      });

      console.log('✅ Amplify initialized successfully');
      console.log('   User Pool:', awsConfig.Auth.Cognito.userPoolId);
      console.log('   API Endpoint:', awsConfig.API.GraphQL.endpoint);
      
      isConfigured = true;
      setInitialized(true);

    } catch (err) {
      console.error('❌ Failed to initialize Amplify:', err);
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#fef2f2',
        padding: '2rem'
      }}>
        <div style={{ 
          maxWidth: '600px',
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>
            Configuration Error
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{error}</p>
          <details style={{ textAlign: 'left', marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#3b82f6' }}>
              Configuration Details
            </summary>
            <pre style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f3f4f6',
              borderRadius: '0.25rem',
              overflow: 'auto',
              fontSize: '0.875rem'
            }}>
              {JSON.stringify(awsConfig, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

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
          <p style={{ color: '#6b7280' }}>Initializing AWS Amplify...</p>
        </div>
      </div>
    );
  }

  return children;
}