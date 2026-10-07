import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppsFlagGate } from './components/apps-flag-gate';
import {
  ADMIN_MESSAGE_SOURCE,
  type BridgeContext,
  isAppMessage,
  isKnownOperation,
  resolveApiPath,
  resolveAppRoute,
  resolveNavigation,
} from './lib/bridge';
import { Button, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { Link, useLocation, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { appRoute } from './lib/routes';
import { LucideIcon } from '@tryghost/shade/utils';
import { getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import {
  getInstallation,
  isInstallationActive,
  needsApproval,
  useInstallations,
} from './lib/installations';
import { UpdateAppDialog } from './components/app-review';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useEmberOwnedRouteMatcher } from '@/routes';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useThemeContext } from '@/providers/theme-context';
import type { AppInstallation } from './types';

/** How long an app gets to say it's ready before Ghost calls it unresponsive. */
const READY_TIMEOUT_MS = 12000;

type FrameStatus = 'loading' | 'ready' | 'failed';

const NotResponding: React.FC<{
  installation: AppInstallation;
  startedAt: Date;
  onRetry: () => void;
}> = ({ installation, startedAt, onRetry }) => (
  <div className="flex size-full items-center justify-center" data-testid="app-not-responding">
    <Stack align="center" className="w-full max-w-md text-center" gap="lg">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <LucideIcon.CloudOff className="size-5" strokeWidth={1.5} />
      </span>
      <Stack gap="xs">
        <Text as="h1" size="xl" weight="semibold">
          {installation.manifest.name} isn’t responding
        </Text>
        <Text tone="secondary">
          Ghost couldn’t reach the app. It might be down, or having a temporary problem. Your site
          isn’t affected.
        </Text>
      </Stack>
      <Inline gap="sm" justify="center">
        <Button variant="outline" asChild>
          <Link to="/apps">Back to Apps</Link>
        </Button>
        <Button onClick={onRetry}>Try again</Button>
      </Inline>
      <details className="w-full border-t pt-3 text-left text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium">Details</summary>
        <div className="mt-2 rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed">
          No response from {new URL(installation.manifest.url).host} after {READY_TIMEOUT_MS / 1000}
          s
          <br />
          Started {startedAt.toLocaleTimeString()}
        </div>
      </details>
    </Stack>
  </div>
);

const AppFrame: React.FC<{ installation: AppInstallation; route: string }> = ({
  installation,
  route,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const fetchApi = useFetchApi();
  const isEmberOwned = useEmberOwnedRouteMatcher();
  const { resolvedTheme } = useThemeContext();
  const { data: siteData } = useBrowseSite();
  const { data: currentUser } = useCurrentUser();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<FrameStatus>('loading');
  const [startedAt, setStartedAt] = useState(() => new Date());

  const appUrl = installation.manifest.url;
  const appOrigin = useMemo(() => new URL(appUrl).origin, [appUrl]);

  const context = useMemo<BridgeContext>(
    () => ({
      site: { title: siteData?.site.title ?? '', url: siteData?.site.url ?? '' },
      user: { name: currentUser?.name ?? '', email: currentUser?.email ?? '' },
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      route,
    }),
    [siteData, currentUser, resolvedTheme, route],
  );
  const contextRef = useRef(context);
  contextRef.current = context;

  const post = useCallback(
    (message: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(
        { source: ADMIN_MESSAGE_SOURCE, ...message },
        appOrigin,
      );
    },
    [appOrigin],
  );

  // Keep the app in step with Admin once it's listening: the theme, and the
  // route when the sidebar or the back button changes it.
  useEffect(() => {
    if (status === 'ready') {
      post({ event: 'context', data: context });
    }
  }, [context, status, post]);

  useEffect(() => {
    if (status !== 'loading') {
      return;
    }
    const timer = window.setTimeout(() => setStatus('failed'), READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status, attempt]);

  useEffect(() => {
    const previousTitle = document.title;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      // Only the app's own frame, from the app's own origin, is listened to.
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== appOrigin) {
        return;
      }
      if (!isAppMessage(event.data)) {
        return;
      }

      const { id, op, payload } = event.data;
      const opName = String(op);
      const reply = (message: { ok: true; result?: unknown } | { ok: false; error: string }) =>
        post({ id, ...message });

      // Every call checks the installation is still active, so uninstalling
      // stops an app that's already open.
      if (!isInstallationActive(installation.id)) {
        reply({ ok: false, error: 'This app is no longer installed.' });
        return;
      }

      if (!isKnownOperation(op)) {
        reply({ ok: false, error: `Unsupported operation: ${opName}` });
        return;
      }

      const data = (payload ?? {}) as Record<string, unknown>;

      switch (op) {
        case 'ready':
          setStatus('ready');
          reply({ ok: true, result: contextRef.current });
          return;
        case 'getContext':
          reply({ ok: true, result: contextRef.current });
          return;
        case 'setTitle': {
          const title = typeof data.title === 'string' ? data.title.slice(0, 120) : '';
          document.title = title
            ? `${title} - ${contextRef.current.site.title}`
            : installation.manifest.name;
          reply({ ok: true });
          return;
        }
        case 'setRoute': {
          const path = resolveAppRoute(data.path);
          if (!path) {
            reply({ ok: false, error: 'Routes must be paths inside the app, like “/settings”.' });
            return;
          }
          navigate(appRoute(installation.id, path), { replace: data.replace === true });
          reply({ ok: true });
          return;
        }
        case 'navigate': {
          const to = resolveNavigation(data.to);
          if (!to) {
            reply({ ok: false, error: 'Apps can only navigate within Admin.' });
            return;
          }
          if (isEmberOwned(to.split('?')[0])) {
            window.location.hash = `#${to}`;
          } else {
            navigate(to);
          }
          reply({ ok: true });
          return;
        }
        case 'api.get': {
          const { apiRoot } = getGhostPaths();
          const path = resolveApiPath(data.path, apiRoot, window.location.origin);
          if (!path) {
            reply({ ok: false, error: 'That Admin API path isn’t available to apps.' });
            return;
          }
          try {
            const result = await fetchApi<unknown>(new URL(path, window.location.origin), {
              retry: false,
              sessionExpiryRedirect: false,
            });
            reply({ ok: true, result });
          } catch {
            reply({ ok: false, error: 'The Admin API request failed.' });
          }
          return;
        }
      }
    };

    const listener = (event: MessageEvent) => {
      void onMessage(event);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [appOrigin, fetchApi, installation, isEmberOwned, navigate, post]);

  const retry = () => {
    setStatus('loading');
    setStartedAt(new Date());
    setAttempt((value) => value + 1);
  };

  if (status === 'failed') {
    return <NotResponding installation={installation} startedAt={startedAt} onRetry={retry} />;
  }

  return (
    <div className="relative size-full">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingIndicator size="lg" />
        </div>
      )}
      <iframe
        key={attempt}
        ref={iframeRef}
        allow=""
        className={status === 'ready' ? 'size-full' : 'size-full opacity-0'}
        data-testid="app-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        // The app runs on its own origin (checked when it was installed), so
        // allow-same-origin keeps it on that origin rather than Admin's.
        sandbox="allow-scripts allow-same-origin allow-forms"
        src={appUrl}
        title={installation.manifest.name}
      />
    </div>
  );
};

/**
 * An updated app waiting on more access doesn't load: the page explains why and
 * offers the review, which opens straight away when the app is visited.
 */
const AwaitingApproval: React.FC<{ installation: AppInstallation }> = ({ installation }) => {
  const [reviewing, setReviewing] = useState(true);

  return (
    <div className="flex size-full items-center justify-center" data-testid="app-needs-approval">
      <EmptyIndicator
        actions={<Button onClick={() => setReviewing(true)}>Review access</Button>}
        description="It’s been updated and needs more access before it can open."
        title={`${installation.manifest.name} needs your approval`}
      >
        <LucideIcon.ShieldAlert />
      </EmptyIndicator>
      <UpdateAppDialog installation={reviewing ? installation : null} onOpenChange={setReviewing} />
    </div>
  );
};

const AppView: React.FC = () => {
  const { installationId = '', '*': splat = '' } = useParams();
  const { search } = useLocation();
  const route = `/${splat}${search}`;
  // Subscribing keeps the page in step if the app is uninstalled elsewhere.
  useInstallations();
  const installation = getInstallation(installationId);

  if (!installation || installation.status !== 'active') {
    return (
      <div className="flex size-full items-center justify-center">
        <EmptyIndicator
          actions={
            <Button asChild>
              <Link to="/apps">Go to Apps</Link>
            </Button>
          }
          title="This app isn’t installed"
        >
          <LucideIcon.LayoutGrid />
        </EmptyIndicator>
      </div>
    );
  }

  if (needsApproval(installation)) {
    return <AwaitingApproval key={installation.id} installation={installation} />;
  }

  // Ghost keeps only the nav and the standard page margin; the rest is the app's.
  return (
    <div className="size-full p-4 lg:p-6" data-testid="app-view">
      <AppFrame installation={installation} route={route} />
    </div>
  );
};

const AppViewScreen: React.FC = () => (
  <AppsFlagGate>
    <AppView />
  </AppsFlagGate>
);

export default AppViewScreen;
