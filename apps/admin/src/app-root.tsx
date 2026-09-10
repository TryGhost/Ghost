import { StrictMode } from 'react';
import {
  FrameworkProvider,
  RouterProvider,
  type TopLevelFrameworkProps,
  useLocation,
} from '@tryghost/admin-x-framework';
import { ShadeApp } from '@tryghost/shade/app';

import App from './app.tsx';
import { routes, useIsEmberOwnedRoute } from './routes.tsx';
import { useResolvedAdmin7 } from './admin7/use-resolved-admin7';
import { useThemeContext } from './providers/theme-context';
import { ThemeProvider } from './providers/theme-provider';

function ThemedAdminApp() {
  const { resolvedTheme } = useThemeContext();
  const { pathname } = useLocation();
  const isEmberOwnedRoute = useIsEmberOwnedRoute(pathname);
  const admin7 = useResolvedAdmin7({ pathname, surface: isEmberOwnedRoute ? 'ember' : 'react' });

  return (
    <ShadeApp
      admin7={admin7}
      className="shade-admin"
      darkMode={resolvedTheme === 'dark'}
      data-react-admin-mounted
    >
      <App />
    </ShadeApp>
  );
}

/**
 * The full admin provider pyramid, shared verbatim by the production entry
 * point (src/main.tsx) and the acceptance harness's renderAdminApp — so "the
 * harness renders the same provider stack as main.tsx" is true by
 * construction. Only the `framework` props (navigation/bridge callbacks,
 * query client) differ between the two.
 */
export function AdminAppRoot({ framework }: { framework: TopLevelFrameworkProps }) {
  return (
    <StrictMode>
      <FrameworkProvider {...framework}>
        <RouterProvider prefix={'/'} routes={routes}>
          <ThemeProvider>
            <ThemedAdminApp />
          </ThemeProvider>
        </RouterProvider>
      </FrameworkProvider>
    </StrictMode>
  );
}
