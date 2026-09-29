import { useState } from 'react';
import { Outlet } from '@tryghost/admin-x-framework';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { EmberProvider, EmberFallback, EmberRoot } from './ember-bridge';
import { AdminLayout } from './layout/admin-layout';
import {
  useEmberAuthSync,
  useEmberDataSync,
  useEmberListReturnSync,
  useEmberNotificationsHost,
} from './ember-bridge';
import { AdminAlerts, createAlertsStore, useServerNotifications } from './alerts';
import { DocsBotWidgetHost } from './docsbot-widget-host';
import { useAccentColorProperties } from './hooks/use-accent-color-properties';

function App() {
  const { data: currentUser } = useCurrentUser();
  const [alerts] = useState(createAlertsStore);
  // Warm the settings cache at boot (as the removed AppProvider did): screens
  // hold on settings, and resolving it before routes mount keeps route guards
  // (e.g. force-upgrade) ahead of screen-level data fetches.
  useBrowseSettings();
  useAccentColorProperties();
  useEmberAuthSync();
  useEmberDataSync();
  useEmberListReturnSync();
  useEmberNotificationsHost(alerts);
  useServerNotifications(alerts);

  return (
    <EmberProvider>
      <AdminAlerts store={alerts} />
      {currentUser ? (
        <AdminLayout>
          <Outlet />
          <EmberRoot />
          <DocsBotWidgetHost />
        </AdminLayout>
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
