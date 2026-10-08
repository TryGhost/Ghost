import { useState } from 'react';
import { Outlet } from '@tryghost/admin-x-framework';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { UnauthorizedError } from '@tryghost/admin-x-framework/errors';
import { AdminLayout } from './layout/admin-layout';
import { BillingFrame } from './billing/api';
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
import { SignedOutApp, useAuthNotice } from './auth/api';
import { useSentry } from './sentry';
import { BootError, BootLoader } from './boot-states';

function App() {
  const { data: currentUser, error, errorUpdatedAt } = useCurrentUser();
  // Not `isError`: every new observer of the failed query refetches it and
  // reports it pending meanwhile, which would unmount the signed-out screens.
  const isSignedOut = !currentUser && errorUpdatedAt > 0;
  const bootError = !currentUser && error && !(error instanceof UnauthorizedError) ? error : null;
  const [alerts] = useState(createAlertsStore);
  useSentry();
  // Warm the settings cache at boot (as the removed AppProvider did): screens
  // hold on settings, and resolving it before routes mount keeps route guards
  // (e.g. force-upgrade) ahead of screen-level data fetches.
  useBrowseSettings();
  useAccentColorProperties();
  useDocumentTitle();
  usePrivateSiteLogin();
  useServerNotifications(alerts);
  useUpgradeStatusAlerts(alerts);
  useAuthNotice(Boolean(currentUser));
  usePreloadEditor(Boolean(currentUser));
  useGlobalShortcuts(Boolean(currentUser));

  return (
    <>
      <AdminAlerts store={alerts} />
      {currentUser ? (
        <AdminLayout>
          <Outlet />
          <BillingFrame alerts={alerts} />
          <DocsBotWidgetHost />
          <ClientExtensionScript />
        </AdminLayout>
      ) : bootError ? (
        <BootError error={bootError} />
      ) : isSignedOut ? (
        <SignedOutApp />
      ) : (
        <BootLoader />
      )}
    </>
  );
}

export default App;
