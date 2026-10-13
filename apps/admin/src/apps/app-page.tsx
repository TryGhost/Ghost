import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { StartContext, Theme } from '@tryghost/app-contracts/bridge';
import {
  Link,
  useFramework,
  useLocation,
  useNavigate,
  useParams,
} from '@tryghost/admin-x-framework';
import {
  type AppInstallation,
  type AppSession,
  useReadAppInstallation,
  useStartAppSession,
} from '@tryghost/admin-x-framework/api/app-installations';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { type SiteData, useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useThemeContext } from '@/providers/theme-context';
import { AppsGate } from './components/apps-gate';
import { InstallDialog } from './components/install-dialog/install-dialog';
import { appPathFromLocation, appPathRoute, normaliseAppPath } from './lib/app-path';
import { createAdminApiFetch } from './lib/bridge-fetch';
import { type AppFrameHost, bindAppFrame } from './lib/bridge-host';
import { placeRoute } from './lib/bridge-places';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX, appFrameTimeouts, isGhostOrigin } from './lib/frame';
import { isInstallationNotFound } from './lib/not-found';
import { reportAppsError } from './lib/report-error';
import { appPageUrl, servedFrom } from './lib/served-from';

type FrameStatus = 'loading' | 'ready' | 'failed';

const Centered: React.FC<{ children: React.ReactNode; testId?: string }> = ({
  children,
  testId,
}) => (
  <div className="flex size-full items-center justify-center" data-testid={testId}>
    {children}
  </div>
);

const NotResponding: React.FC<{
  installation: AppInstallation;
  startedAt: Date;
  onRetry: () => void;
}> = ({ installation, startedAt, onRetry }) => (
  <Centered testId="app-not-responding">
    <Stack align="center" className="w-full max-w-md" gap="lg">
      <EmptyIndicator
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/apps">Back to Apps</Link>
            </Button>
            <Button onClick={onRetry}>Try again</Button>
          </>
        }
        description="Ghost couldn’t reach the app. It might be down, or having a temporary problem. Your site isn’t affected."
        title={`${installation.manifest.name} isn’t responding`}
      >
        <LucideIcon.CloudOff />
      </EmptyIndicator>
      <Text size="sm" tone="secondary">
        No response from {servedFrom(installation.manifest)} since {startedAt.toLocaleTimeString()}.
      </Text>
    </Stack>
  </Centered>
);

/**
 * Shows the app's page title as Admin's own while the page is open, and puts Admin's
 * back when it closes.
 */
function useAppTitle(appName: string, title: string | undefined) {
  useEffect(() => {
    if (title === undefined) {
      return;
    }
    const previous = document.title;
    document.title = title ? `${title} · ${appName}` : appName;
    return () => {
      document.title = previous;
    };
  }, [appName, title]);
}

const sameTheme = (a: Theme | undefined, b: Theme) =>
  a?.mode === b.mode && a.accent_color === b.accent_color;

/**
 * Ends the session when the installation moves on from the revision it was started
 * against, as reading it again shows: the app is then running something nobody approved,
 * or nothing at all. Only a read made during this session counts.
 *
 * This only sees changes this tab reads. Changes made in another tab, or by another staff
 * user, are deferred to the app token in Permissions and auth.
 */
function useSessionEnd(session: AppSession, onEnded: () => void) {
  const [since] = useState(() => Date.now());
  const { data, dataUpdatedAt, isFetching } = useReadAppInstallation(session.installation.id, {
    defaultErrorHandler: false,
    // Without the history the details page shows; this one has no use for it.
    searchParams: {},
    // Coming back to the tab is when a change made meanwhile shows up.
    refetchOnWindowFocus: 'always',
  });
  const revision = data?.app_installations[0]?.revision;
  useEffect(() => {
    if (
      !isFetching &&
      dataUpdatedAt >= since &&
      revision !== undefined &&
      revision !== session.revision
    ) {
      onEnded();
    }
  }, [dataUpdatedAt, isFetching, onEnded, revision, session.revision, since]);
}

/**
 * The app's page, loaded from its own URL in a sandboxed frame and bound to Admin by the
 * bridge. The frame stays hidden until the app has started, which is what ready means; a
 * page that never says hello, or doesn't start in time, gets the not-responding state,
 * and the rest of Admin stays usable either way.
 */
const AppFrame: React.FC<{
  session: AppSession;
  site: SiteData;
  timezone: string;
  accentColor: string;
  onEnded: () => void;
}> = ({ session, site, timezone, accentColor, onEnded }) => {
  const { installation } = session;
  useSessionEnd(session, onEnded);
  const navigate = useNavigate();
  const location = useLocation();
  const { ghostVersion } = useFramework();
  const { data: user } = useCurrentUser();
  const { resolvedTheme } = useThemeContext();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<FrameStatus>('loading');
  const [startedAt, setStartedAt] = useState(() => new Date());
  const [title, setTitle] = useState<string>();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<AppFrameHost | null>(null);
  const url = appPageUrl(installation.manifest);
  const surfaceOrigin = new URL(url).origin;
  const { id, manifest } = installation;

  useAppTitle(manifest.name, title);

  const path = appPathFromLocation(id, location);
  const theme = useMemo<Theme>(
    () => ({ mode: resolvedTheme, accent_color: accentColor }),
    [resolvedTheme, accentColor],
  );

  // What the app was last told, or told Admin, so a change is passed on once and never
  // echoed back to where it came from.
  const appPath = useRef<string>();
  const appTheme = useRef<Theme>();

  const context: StartContext = {
    site: { url: site.url, title: site.title, timezone, locale: site.locale },
    user: { id: user?.id ?? '', role: user?.roles[0]?.name ?? '' },
    theme,
    session: { revision: session.revision },
    path,
  };
  // Read when the page connects, so it starts with Admin as it is then.
  const contextRef = useRef(context);
  contextRef.current = context;
  const pathRef = useRef(path);
  pathRef.current = path;
  // The session outlives navigations, so it mustn't depend on a navigate that may not.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const adminApiFetch = useMemo(
    () => createAdminApiFetch({ apiRoot: new URL(apiUrl('/')), ghostVersion }),
    [ghostVersion],
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    let current = true;
    const host = bindAppFrame({
      frame,
      surfaceOrigin,
      context: () => {
        appPath.current = contextRef.current.path;
        appTheme.current = contextRef.current.theme;
        return contextRef.current;
      },
      fetchAdminApi: adminApiFetch,
      handlers: {
        titleChanged: (next) => setTitle(next),
        pathChanged: (next, { replace }) => {
          const normalised = normaliseAppPath(next);
          appPath.current = normalised;
          if (normalised !== pathRef.current) {
            navigateRef.current(appPathRoute(id, normalised), { replace });
          }
        },
        open: (place) => navigateRef.current(placeRoute(place)),
      },
    });
    hostRef.current = host;

    const fail = () => {
      if (current) {
        host.dispose();
        setTitle(undefined);
        setStatus('failed');
      }
    };
    // The clock runs from the frame's mount, and stops the moment the app has started, so
    // nothing can call a started app unresponsive.
    const timer = window.setTimeout(fail, appFrameTimeouts.ready);
    host.ready.then(
      () => {
        window.clearTimeout(timer);
        if (current) {
          setStatus('ready');
        }
      },
      () => {
        window.clearTimeout(timer);
        fail();
      },
    );

    return () => {
      current = false;
      window.clearTimeout(timer);
      host.dispose();
      hostRef.current = null;
    };
  }, [adminApiFetch, attempt, id, surfaceOrigin]);

  // Back, forward or a link moved Admin within the app: the app follows, without reloading.
  useEffect(() => {
    const host = hostRef.current;
    if (host?.connected && appPath.current !== path) {
      appPath.current = path;
      host.pathChanged(path);
    }
  }, [path]);

  useEffect(() => {
    const host = hostRef.current;
    if (host?.connected && !sameTheme(appTheme.current, theme)) {
      appTheme.current = theme;
      host.themeChanged(theme);
    }
  }, [theme]);

  const retry = () => {
    setStatus('loading');
    setTitle(undefined);
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
        ref={frameRef}
        allow={APP_FRAME_ALLOW}
        aria-hidden={status !== 'ready'}
        // Hidden, not transparent: a frame that's still loading mustn't take focus or clicks.
        // A block, with no border: inline, the frame would sit on the text baseline and
        // leave a gap under itself for the page to scroll.
        className={cn('block size-full border-0', status !== 'ready' && 'invisible')}
        data-testid="app-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={APP_FRAME_SANDBOX}
        src={url}
        title={manifest.name}
      />
    </div>
  );
};

/**
 * The page of an app that shouldn't be framed: it's on Ghost's own address, so it would
 * be Ghost, not the app. Nothing of it loads.
 */
const NotFramed: React.FC<{ installation: AppInstallation }> = ({ installation }) => (
  <Centered testId="app-not-framed">
    <EmptyIndicator
      actions={
        <Button variant="outline" asChild>
          <Link to="/apps">Back to Apps</Link>
        </Button>
      }
      description="Its page is at the same address as Ghost, which Admin doesn’t show. Reinstall the app from its own address."
      title={`${installation.manifest.name} can’t open here`}
    >
      <LucideIcon.ShieldOff />
    </EmptyIndicator>
  </Centered>
);

/**
 * An active app loads in its frame, once its page is known to be somewhere other than
 * Ghost: Admin's own address, or the site's, which Admin may be served from too. Nothing
 * is framed until the site's address is known, so the check can't be skipped by timing,
 * or by the site's address failing to load. It's a check of the URL the frame starts
 * from; `isGhostOrigin` says what it doesn't cover.
 */
const ActiveApp: React.FC<{ session: AppSession; onEnded: () => void }> = ({
  session,
  onEnded,
}) => {
  const { installation } = session;
  const site = useBrowseSite({ defaultErrorHandler: false });
  const settings = useBrowseSettings({ defaultErrorHandler: false });
  const error = site.error ?? settings.error;
  useEffect(() => {
    if (error) {
      reportAppsError(error);
    }
  }, [error]);
  if (!site.data || !settings.data) {
    return (
      <Centered>
        {error ? (
          <Stack align="center" gap="md">
            <Text tone="secondary">
              {site.error
                ? 'Couldn’t load the site’s address, which opening an app needs.'
                : 'Couldn’t load the site’s settings, which opening an app needs.'}
            </Text>
            <Button
              variant="outline"
              onClick={() => void (site.error ? site.refetch() : settings.refetch())}
            >
              Retry
            </Button>
          </Stack>
        ) : (
          <LoadingIndicator size="md" />
        )}
      </Centered>
    );
  }
  const ghostUrls = [window.location.href, site.data.site.url];
  if (isGhostOrigin(appPageUrl(installation.manifest), ghostUrls)) {
    return <NotFramed installation={installation} />;
  }
  const { settings: values } = settings.data;
  return (
    <AppFrame
      accentColor={
        getSettingValue<string>(values, 'accent_color') ?? site.data.site.accent_color ?? ''
      }
      session={session}
      site={site.data.site}
      timezone={getSiteTimezone(values)}
      onEnded={onEnded}
    />
  );
};

/**
 * A suspended app doesn't load: the review of its changes opens on top of the page straight
 * away, and the page behind it says why, with a way back to the review once it's closed.
 */
const NeedsApproval: React.FC<{ installation: AppInstallation; onApproved: () => void }> = ({
  installation,
  onApproved,
}) => {
  const [reviewing, setReviewing] = useState(true);
  return (
    <Centered testId="app-needs-approval">
      <EmptyIndicator
        actions={<Button onClick={() => setReviewing(true)}>Review changes</Button>}
        description="It’s been updated and needs your approval before it can open."
        title={`${installation.manifest.name} needs approval`}
      >
        <LucideIcon.ShieldAlert />
      </EmptyIndicator>
      {reviewing && (
        <InstallDialog
          manifestUrl={installation.manifest_url}
          onClose={() => setReviewing(false)}
          onDone={onApproved}
        />
      )}
    </Centered>
  );
};

const NotInstalled: React.FC = () => (
  <Centered testId="app-not-installed">
    <EmptyIndicator
      actions={
        <Button asChild>
          <Link to="/apps">Go to Apps</Link>
        </Button>
      }
      description="It may have been uninstalled."
      title="This app isn’t installed"
    >
      <LucideIcon.LayoutGrid />
    </EmptyIndicator>
  </Centered>
);

/**
 * Starts a session of the app when the page opens, and again on `restart`. Ghost re-checks
 * the app's manifest first, and its answer alone decides what the page shows; nothing of
 * the app loads before it.
 */
function useAppSession(installationId: string): {
  settled: boolean;
  session?: AppSession;
  error?: unknown;
  /** Ends this session and starts another, as after approving changes. */
  restart: () => void;
} {
  const { mutateAsync: start } = useStartAppSession();
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState<{ key: string; session?: AppSession; error?: unknown }>();
  const started = useRef<string | null>(null);
  const key = `${installationId}:${generation}`;

  useEffect(() => {
    if (started.current === key) {
      return;
    }
    started.current = key;
    start(installationId).then(
      (response) => setResult({ key, session: response.app_sessions[0] }),
      (error: unknown) => setResult({ key, error }),
    );
  }, [installationId, key, start]);

  const restart = useCallback(() => setGeneration((value) => value + 1), []);
  return result?.key === key ? { settled: true, ...result, restart } : { settled: false, restart };
}

/**
 * `/apps/:installationId/*`. Only an active installation loads, in a session of its own;
 * the rest of the path is the app's own route, which the bridge passes on.
 */
export const AppPage: React.FC = () => {
  const { installationId = '' } = useParams();
  const { settled, session, error, restart } = useAppSession(installationId);
  const installation = session?.installation;
  const notFound = isInstallationNotFound(error);
  useEffect(() => {
    if (error && !notFound) {
      reportAppsError(error);
    }
  }, [error, notFound]);

  let body: React.ReactNode;
  if (!settled) {
    body = (
      <Centered>
        <LoadingIndicator size="md" />
      </Centered>
    );
  } else if (session && installation?.status === 'active') {
    body = <ActiveApp session={session} onEnded={restart} />;
  } else if (installation?.status === 'suspended') {
    body = <NeedsApproval installation={installation} onApproved={restart} />;
  } else if (error && !notFound) {
    body = (
      <Centered>
        <Stack align="center" gap="md">
          <Text tone="secondary">Couldn’t load this app. Please try again.</Text>
          <Button variant="outline" onClick={restart}>
            Retry
          </Button>
        </Stack>
      </Centered>
    );
  } else {
    // Not found, uninstalled, or answered with nothing: there is nothing to show but the
    // way back.
    body = <NotInstalled />;
  }

  // Ghost keeps only the nav and the page margin; the rest is the app's.
  return (
    <div className="size-full p-4 lg:p-6" data-testid="app-page">
      {body}
    </div>
  );
};

const AppPageScreen: React.FC = () => (
  <AppsGate>
    <AppPage />
  </AppsGate>
);

export default AppPageScreen;
