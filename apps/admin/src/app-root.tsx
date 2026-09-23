import { StrictMode } from 'react';
import {
  FrameworkProvider,
  RouterProvider,
  type TopLevelFrameworkProps,
  useLocation,
} from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { ShadeApp } from '@tryghost/shade/app';
import { cn } from '@tryghost/shade/utils';

import App from './app.tsx';
import { routes, useIsEmberOwnedRoute } from './routes.tsx';
import { useThemeContext } from './providers/theme-context';
import { ThemeProvider } from './providers/theme-provider';

function ThemedAdminApp() {
  const { resolvedTheme } = useThemeContext();
  const { pathname } = useLocation();
  const isEmberOwnedRoute = useIsEmberOwnedRoute(pathname);
  const isAdmin7 =
    useFeatureFlag('admin7Pill') && !/^\/editor(?:\/|$)/.test(pathname) && !isEmberOwnedRoute;

  return (
    <ShadeApp
      className={cn('shade-admin', isAdmin7 && 'admin7-pill')}
      darkMode={resolvedTheme === 'dark'}
      isAdmin7={isAdmin7}
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
