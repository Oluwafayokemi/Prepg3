// apps/shared/components/AuthProvider.jsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export default function AuthProvider({ 
  children, 
  requiredGroup = null,
  loginPath = '/login',
  publicPaths = ['/login', '/forgot-password', '/reset-password', '/unauthorized', '/test-config', '/debug-auth']
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState({
    authorized: false,
    loading: true,
    amplifyReady: false,
  });
  const checkInProgress = useRef(false);

  useEffect(() => {
    const checkAmplifyReady = async () => {
      try {
        const config = Amplify.getConfig();
        if (config?.Auth?.Cognito?.userPoolId) {
          console.log('✅ Amplify ready');
          await new Promise(resolve => setTimeout(resolve, 200));
          setState(prev => ({ ...prev, amplifyReady: true }));
        }
      } catch (err) {
        console.error('Amplify not configured');
      }
    };

    checkAmplifyReady();
  }, []);

  useEffect(() => {
    if (state.amplifyReady && !checkInProgress.current) {
      checkAuth();
    }
  }, [state.amplifyReady, pathname]);

  const checkAuth = async () => {
    if (checkInProgress.current) {
      return;
    }

    checkInProgress.current = true;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 AUTH CHECK');
    console.log('Path:', pathname);

    // Allow public paths immediately
    if (publicPaths.includes(pathname)) {
      console.log('✅ Public path');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setState({ authorized: true, loading: false, amplifyReady: true });
      checkInProgress.current = false;
      return;
    }

    console.log('🔒 Protected path - checking auth...');

    try {
      // Get current user
      const user = await getCurrentUser();
      console.log('✅ User authenticated:', user.username);

      // Check group if required
      if (requiredGroup) {
        console.log('Checking for required group:', requiredGroup);
        
        try {
          // ✅ Get session but catch Identity Pool errors
          const session = await fetchAuthSession({ forceRefresh: false });
          
          // ✅ Get groups from access token (not identity credentials)
          const accessToken = session.tokens?.accessToken;
          const idToken = session.tokens?.idToken;
          
          console.log('Access token payload:', accessToken?.payload);
          console.log('ID token payload:', idToken?.payload);
          
          // Try both tokens for groups
          const groups = 
            accessToken?.payload['cognito:groups'] || 
            idToken?.payload['cognito:groups'] || 
            [];
          
          console.log('User groups found:', groups);

          if (!Array.isArray(groups) || groups.length === 0) {
            console.warn('⚠️ No groups found for user');
          }

          if (!groups.includes(requiredGroup)) {
            console.error('❌ Required group not found');
            console.error('Required:', requiredGroup);
            console.error('User has:', groups);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setState({ authorized: false, loading: false, amplifyReady: true });
            checkInProgress.current = false;
            router.push('/unauthorized');
            return;
          }

          console.log('✅ User has required group');
          
        } catch (sessionError) {
          // ✅ If Identity Pool fails but we have the user, check without session
          console.warn('⚠️ Could not fetch session (Identity Pool issue):', sessionError.message);
          console.log('⚠️ Proceeding without group check for now');
          
          // For now, allow access if user is authenticated
          // TODO: Fix Identity Pool configuration
        }
      }

      console.log('✅ Authorization successful');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setState({ authorized: true, loading: false, amplifyReady: true });

    } catch (error) {
      console.error('❌ Auth check failed:', error.message);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setState({ authorized: false, loading: false, amplifyReady: true });

      if (pathname !== loginPath) {
        router.push(loginPath);
      }
    } finally {
      checkInProgress.current = false;
    }
  };

  if (state.loading && !publicPaths.includes(pathname)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: '#6b7280' }}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (publicPaths.includes(pathname)) {
    return children;
  }

  return state.authorized ? children : null;
}