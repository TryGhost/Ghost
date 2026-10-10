import { StrictMode, useLayoutEffect } from 'react';
import {
  FrameworkProvider,
  RouterProvider,
  type TopLevelFrameworkProps,
} from '@tryghost/admin-x-framework';
import { ShadeApp } from '@tryghost/shade/app';

import App from './app.tsx';
import { reloadAfterChunkLoadError } from './chunk-load-recovery';
import { installHistoryPopGate } from './hooks/use-history-pop-navigation-guard';
import { ScreenTransitionProvider } from './layout/screen-transition-provider';
import { RouteError } from './route-error';
import { routes } from './routes.tsx';
import { useThemeContext } from './providers/theme-context';
import { ThemeProvider } from './providers/theme-provider';

// At module scope, so it is in place before `AdminAppRoot` creates the router.
installHistoryPopGate();

// Lets body-level CSS (index.css) react to the mounted app. A class keeps
// that cheap: `body:has(#root ...)` makes Chromium restyle the whole document
// after almost every DOM insertion.
function useMountedBodyClass() {
  useLayoutEffect(() => {
    document.body.classList.add('react-admin-mounted');
    return () => {
      document.body.classList.remove('react-admin-mounted');
    };
  }, []);
}

const routeErrorElement = <RouteError />;

function ThemedAdminApp() {
  const { resolvedTheme } = useThemeContext();
  useMountedBodyClass();

  return (
    <ShadeApp
      className="shade-admin"
      darkMode={resolvedTheme === 'dark'}
      data-react-admin-mounted
      isAdmin7
    >
      <ScreenTransitionProvider>
        <App />
      </ScreenTransitionProvider>
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
        <RouterProvider
          errorElement={routeErrorElement}
          prefix={'/'}
          recoverFromError={reloadAfterChunkLoadError}
          routes={routes}
        >
          <ThemeProvider>
            <ThemedAdminApp />
          </ThemeProvider>
        </RouterProvider>
      </FrameworkProvider>
    </StrictMode>
  );
}
