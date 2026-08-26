import { Outlet } from '@tryghost/admin-x-framework';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useUserPreferences } from '@/hooks/user-preferences';
import { useThemeContext } from '@/providers/theme-context';
import { EmberProvider, EmberFallback, EmberRoot } from './ember-bridge';
import { AdminLayout } from './layout/admin-layout';
import { useEmberAuthSync, useEmberDataSync } from './ember-bridge';
import { DocsBotWidgetHost } from './docsbot-widget-host';

function App() {
  const { data: currentUser } = useCurrentUser();
  const { isPending: configPending, isFetched: configFetched } = useBrowseConfig({
    refetchOnMount: false,
  });
  const { data: preferences, isFetched: preferencesFetched } = useUserPreferences();
  const { isThemeReady } = useThemeContext();
  // Initial layout needs both rollout eligibility and the saved navigation state.
  // Unknown inputs must not render the legacy open sidebar before switching to
  // the saved layout. Later refetches and terminal errors keep the shell mounted.
  const preferencesFailed = preferencesFetched && preferences === undefined;
  const shellPending = (configPending && !configFetched) || (!isThemeReady && !preferencesFailed);
  // Warm the settings cache at boot (as the removed AppProvider did): screens
  // hold on settings, and resolving it before routes mount keeps route guards
  // (e.g. force-upgrade) ahead of screen-level data fetches.
  useBrowseSettings();
  useEmberAuthSync();
  useEmberDataSync();

  return (
    <EmberProvider>
      {currentUser ? (
        shellPending ? (
          <EmberRoot />
        ) : (
          <AdminLayout>
            <Outlet />
            <EmberRoot />
            <DocsBotWidgetHost />
          </AdminLayout>
        )
      ) : (
        <>
          <EmberFallback />
          <EmberRoot />
        </>
      )}
    </EmberProvider>
  );
}

export default App;
