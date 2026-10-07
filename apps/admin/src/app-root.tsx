import { StrictMode } from 'react';
import {
  FrameworkProvider,
  RouterProvider,
  type TopLevelFrameworkProps,
  useLocation,
} from '@tryghost/admin-x-framework';
import { ShadeApp } from '@tryghost/shade/app';

import App from './app.tsx';
import { installHistoryPopGate } from './hooks/use-history-pop-navigation-guard';
import { routes, useIsEmberOwnedRoute } from './routes.tsx';
import { useThemeContext } from './providers/theme-context';
import { ThemeProvider } from './providers/theme-provider';

// At module scope, so it is in place before `AdminAppRoot` creates the router.
installHistoryPopGate();

function ThemedAdminApp() {
  const { resolvedTheme } = useThemeContext();
  const { pathname } = useLocation();
  const isEmberOwnedRoute = useIsEmberOwnedRoute(pathname);

  return (
    <ShadeApp
      className="shade-admin"
      darkMode={resolvedTheme === 'dark'}
      isAdmin7={!isEmberOwnedRoute}
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
