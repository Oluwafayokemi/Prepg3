// apps/shared/components/UniversalRouter.jsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { matchRoute } from '../utils/router';

// Import all page components
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import NotFoundPage from '../pages/errors/NotFoundPage';
import UnauthorizedPage from '../pages/errors/UnauthorizedPage';

export default function UniversalRouter({ routes, pageComponents }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [routeMatch, setRouteMatch] = useState(null);

  useEffect(() => {
    handleRoute();
  }, [pathname]);

  const handleRoute = async () => {
    setLoading(true);
    
    // Match the route
    const match = matchRoute(pathname, routes);
    
    if (!match) {
      // Route not found
      setRouteMatch({ component: 'NotFoundPage', params: {} });
      setLoading(false);
      return;
    }

    setRouteMatch(match);

    // Check if route requires authentication
    if (!match.route.public) {
      try {
        const user = await getCurrentUser();
        
        // Check required group
        if (match.route.requiredGroup) {
          const groups = user.signInUserSession?.accessToken?.payload?.['cognito:groups'] || [];
          
          if (!groups.includes(match.route.requiredGroup)) {
            setRouteMatch({ component: 'UnauthorizedPage', params: {} });
            setLoading(false);
            return;
          }
        }
        
        setAuthorized(true);
      } catch (error) {
        router.push('/login');
        return;
      }
    } else {
      setAuthorized(true);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!routeMatch) {
    return <NotFoundPage />;
  }

  // Get the component
  const componentName = routeMatch.route?.component || routeMatch.component;
  const Component = pageComponents[componentName];

  if (!Component) {
    console.error(`Component ${componentName} not found`);
    return <NotFoundPage />;
  }

  // Merge route props with params
  const props = {
    ...(routeMatch.route?.props || {}),
    params: routeMatch.params,
  };

  return <Component {...props} />;
}