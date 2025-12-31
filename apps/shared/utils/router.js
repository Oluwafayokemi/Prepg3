// apps/shared/utils/router.js

export function matchRoute(pathname, routes) {
  // First try exact match
  if (routes[pathname]) {
    return { route: routes[pathname], params: {} };
  }

  // Then try pattern matching for dynamic routes
  for (const [pattern, route] of Object.entries(routes)) {
    const regex = new RegExp(
      '^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$'
    );
    const match = pathname.match(regex);

    if (match) {
      // Extract parameter names
      const paramNames = (pattern.match(/:[^/]+/g) || []).map(p => p.slice(1));
      const params = {};
      
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });

      return { route, params };
    }
  }

  return null;
}