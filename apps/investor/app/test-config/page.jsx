// apps/investor/app/test-config/page.jsx
'use client';

import { useEffect, useState } from 'react';

export default function TestConfigPage() {
  const [configStatus, setConfigStatus] = useState({
    fileExists: false,
    hasUserPool: false,
    amplifyConfigured: false,
    error: null,
    config: null
  });

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      // Check if aws-exports.js can be imported
      const configModule = await import('../../../shared/config/aws-exports.js');
      const awsConfig = configModule.awsConfig;
      
      setConfigStatus({
        fileExists: true,
        hasUserPool: !!awsConfig?.Auth?.Cognito?.userPoolId,
        amplifyConfigured: false,
        config: awsConfig,
        error: null
      });

      // Check Amplify configuration
      const { Amplify } = await import('aws-amplify');
      const amplifyConfig = Amplify.getConfig();
      setConfigStatus(prev => ({
        ...prev,
        amplifyConfigured: !!amplifyConfig?.Auth?.Cognito?.userPoolId,
      }));

    } catch (error) {
      setConfigStatus(prev => ({
        ...prev,
        error: error.message
      }));
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px' }}>
      <h1>🔍 Configuration Checker</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Status:</h2>
        <ul style={{ fontSize: '1.1rem', lineHeight: '2' }}>
          <li>
            {configStatus.fileExists ? '✅' : '❌'} aws-exports.js file exists
          </li>
          <li>
            {configStatus.hasUserPool ? '✅' : '❌'} UserPool ID configured
          </li>
          <li>
            {configStatus.amplifyConfigured ? '✅' : '❌'} Amplify configured
          </li>
        </ul>
      </div>

      {configStatus.error && (
        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: '#fee',
          borderRadius: '0.5rem',
          color: '#c00'
        }}>
          <strong>Error:</strong> {configStatus.error}
        </div>
      )}

      {configStatus.config && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Configuration:</h2>
          <pre style={{ 
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
            fontSize: '0.9rem'
          }}>
            {JSON.stringify(configStatus.config, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
        <h3>Next Steps:</h3>
        {!configStatus.fileExists && (
          <p>❌ Run: <code>cd infrastructure && npm run export-config</code></p>
        )}
        {configStatus.fileExists && !configStatus.hasUserPool && (
          <p>❌ The config file exists but has no UserPool ID. Check aws-exports.js</p>
        )}
        {configStatus.hasUserPool && !configStatus.amplifyConfigured && (
          <p>❌ Config exists but Amplify not initialized. Check amplify-config.js</p>
        )}
        {configStatus.amplifyConfigured && (
          <p>✅ Everything looks good! Try <a href="/login">logging in</a></p>
        )}
      </div>
    </div>
  );
}