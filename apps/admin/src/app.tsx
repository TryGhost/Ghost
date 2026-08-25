import { Outlet } from '@tryghost/admin-x-framework';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { EmberProvider, EmberFallback, EmberRoot } from './ember-bridge';
import { AdminLayout } from './layout/admin-layout';
import { useEmberAuthSync, useEmberDataSync } from './ember-bridge';
import { DocsBotWidgetHost } from './docsbot-widget-host';
import { DunningModal } from './dunning-modal';

function App() {
  const { data: currentUser } = useCurrentUser();
  // Warm the settings cache at boot (as the removed AppProvider did): screens
  // hold on settings, and resolving it before routes mount keeps route guards
  // (e.g. force-upgrade) ahead of screen-level data fetches.
  useBrowseSettings();
  useEmberAuthSync();
  useEmberDataSync();

  return (
    <EmberProvider>
      {currentUser ? (
        <>
          <AdminLayout>
            <Outlet />
            <EmberRoot />
            <DocsBotWidgetHost />
          </AdminLayout>
          <DunningModal currentUser={currentUser} />
        </>
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
