import { useState } from 'react';
import { Outlet } from '@tryghost/admin-x-framework';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { UnauthorizedError } from '@tryghost/admin-x-framework/errors';
import { EmberProvider, EmberFallback, EmberRoot } from './ember-bridge';
import { AdminLayout } from './layout/admin-layout';
import { useSyncEmberFullScreen } from './layout/sidebar-visibility';
import { useEmberOwnedRouteMatcher, useSyncEmberRoutePattern } from './routes';
import { BillingFrame } from './billing/api';
import {
  useEmberAuthSync,
  useEmberDataSync,
  useEmberListReturnSync,
  useEmberNotificationsHost,
} from './ember-bridge';
import {
  AdminAlerts,
  createAlertsStore,
  useServerNotifications,
  useUpgradeStatusAlerts,
} from './alerts';
import { DocsBotWidgetHost } from './docsbot-widget-host';
import { ClientExtensionScript } from './client-extension-script';
import { usePreloadEditor } from './use-preload-editor';
import { useGlobalShortcuts } from './global-shortcuts/global-shortcuts';
import { useAccentColorProperties } from './hooks/use-accent-color-properties';
import { useDocumentTitle } from './hooks/use-document-title';
import { usePrivateSiteLogin } from './hooks/use-private-site-login';
import { SignedOutApp, useAuthNotice, useAuthScreensOwner } from './auth/api';
import { useSentry } from './sentry';
import { BootError, BootLoader } from './boot-states';

function App() {
  const { data: currentUser, error, errorUpdatedAt } = useCurrentUser();
  // Not `isError`: every new observer of the failed query refetches it and
  // reports it pending meanwhile, which would unmount the signed-out screens.
  const isSignedOut = !currentUser && errorUpdatedAt > 0;
  const bootError = !currentUser && error && !(error instanceof UnauthorizedError) ? error : null;
  const authScreensOwner = useAuthScreensOwner();
  const [alerts] = useState(createAlertsStore);
  useSentry();
  // Warm the settings cache at boot (as the removed AppProvider did): screens
  // hold on settings, and resolving it before routes mount keeps route guards
  // (e.g. force-upgrade) ahead of screen-level data fetches.
  useBrowseSettings();
  useAccentColorProperties();
  useDocumentTitle();
  usePrivateSiteLogin();
  useEmberAuthSync();
  useEmberDataSync();
  useEmberListReturnSync();
  useSyncEmberFullScreen();
  useSyncEmberRoutePattern();
  useEmberNotificationsHost(alerts);
  useServerNotifications(alerts);
  useUpgradeStatusAlerts(alerts);
  useAuthNotice(Boolean(currentUser));
  usePreloadEditor(Boolean(currentUser));
  useGlobalShortcuts(Boolean(currentUser));
  const isEmberOwned = useEmberOwnedRouteMatcher();

  return (
    <EmberProvider>
      <AdminAlerts store={alerts} />
      {currentUser ? (
        <AdminLayout>
          <Outlet />
          <EmberRoot />
          <BillingFrame alerts={alerts} isEmberOwned={isEmberOwned} />
          <DocsBotWidgetHost />
          <ClientExtensionScript />
        </AdminLayout>
      ) : bootError ? (
        <>
          <BootError error={bootError} />
          <EmberRoot />
        </>
      ) : isSignedOut && authScreensOwner === 'react' ? (
        <>
          <SignedOutApp />
          <EmberRoot />
        </>
      ) : isSignedOut && authScreensOwner === 'ember' ? (
        <>
          <EmberFallback />
          <EmberRoot />
        </>
      ) : (
        <>
          <BootLoader />
          <EmberRoot />
        </>
      )}
    </EmberProvider>
  );
}

export default App;
