import { useState } from 'react';
import { Outlet } from '@tryghost/admin-x-framework';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { EmberProvider, EmberFallback, EmberRoot } from './ember-bridge';
import { AdminLayout } from './layout/admin-layout';
import { useSyncEmberFullScreen } from './layout/sidebar-visibility';
import { useSyncEmberRoutePattern } from './routes';
import {
  useEmberAuthSync,
  useEmberDataSync,
  useEmberListReturnSync,
  useEmberNotificationsHost,
} from './ember-bridge';
import { AdminAlerts, createAlertsStore, useServerNotifications } from './alerts';
import { DocsBotWidgetHost } from './docsbot-widget-host';
import { ClientExtensionScript } from './client-extension-script';
import { useAccentColorProperties } from './hooks/use-accent-color-properties';
import { useDocumentTitle } from './hooks/use-document-title';
import { SignedOutApp, useAuthNotice, useAuthScreensOwner } from './auth/api';

function App() {
  const { data: currentUser, errorUpdatedAt } = useCurrentUser();
  // Not `isError`: every new observer of the failed query refetches it and
  // reports it pending meanwhile, which would unmount the signed-out screens.
  const isSignedOut = !currentUser && errorUpdatedAt > 0;
  const authScreensOwner = useAuthScreensOwner();
  const [alerts] = useState(createAlertsStore);
  // Warm the settings cache at boot (as the removed AppProvider did): screens
  // hold on settings, and resolving it before routes mount keeps route guards
  // (e.g. force-upgrade) ahead of screen-level data fetches.
  useBrowseSettings();
  useAccentColorProperties();
  useDocumentTitle();
  useEmberAuthSync();
  useEmberDataSync();
  useEmberListReturnSync();
  useSyncEmberFullScreen();
  useSyncEmberRoutePattern();
  useEmberNotificationsHost(alerts);
  useServerNotifications(alerts);
  useAuthNotice(Boolean(currentUser));

  return (
    <EmberProvider>
      <AdminAlerts store={alerts} />
      {currentUser ? (
        <AdminLayout>
          <Outlet />
          <EmberRoot />
          <DocsBotWidgetHost />
          <ClientExtensionScript />
        </AdminLayout>
      ) : isSignedOut && authScreensOwner === 'react' ? (
        <>
          <SignedOutApp />
          <EmberRoot />
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
