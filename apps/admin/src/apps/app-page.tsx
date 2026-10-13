import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
  useQueryClient,
} from '@tryghost/admin-x-framework';
import {
  type AppInstallation,
  type AppInstallationsResponseType,
  type AppSession,
  getAppInstallationQueryKey,
  useReadAppInstallation,
  useStartAppSession,
} from '@tryghost/admin-x-framework/api/app-installations';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { type SiteData, useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import type { User } from '@tryghost/admin-x-framework/api/users';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useThemeContext } from '@/providers/theme-context';
import { AppsGate } from './components/apps-gate';
import { InstallDialog } from './components/install-dialog/install-dialog';
import { createAppFrameSession } from './lib/app-frame-session';
import { appPathFromLocation, appPathRoute } from './lib/app-path';
import { createAdminApiFetch } from './lib/bridge-fetch';
import { placeRoute } from './lib/bridge-places';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX, isGhostOrigin } from './lib/frame';
import { isInstallationNotFound, isSessionsRouteMissing } from './lib/not-found';
import { reportAppsError } from './lib/report-error';
import { appPageUrl, servedFrom } from './lib/served-from';

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

const SESSION_END_SEARCH_PARAMS: Record<string, string> = {};

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
    searchParams: SESSION_END_SEARCH_PARAMS,
    // Starting the session put the installation here, so there's nothing to read yet.
    refetchOnMount: false,
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
 * and the rest of Admin stays usable either way. `createAppFrameSession` runs all that;
 * this shows it, and keeps it told where Admin is.
 */
const AppFrame: React.FC<{
  session: AppSession;
  site: SiteData;
  user: User;
  timezone: string;
  accentColor: string;
  onEnded: () => void;
}> = ({ session, site, user, timezone, accentColor, onEnded }) => {
  const { installation } = session;
  useSessionEnd(session, onEnded);
  const navigate = useNavigate();
  const location = useLocation();
  const { ghostVersion } = useFramework();
  const { resolvedTheme } = useThemeContext();
  const url = appPageUrl(installation.manifest);
  const surfaceOrigin = new URL(url).origin;
  const { id, manifest } = installation;

  const path = appPathFromLocation(id, location);
  const theme = useMemo<Theme>(
    () => ({ mode: resolvedTheme, accent_color: accentColor }),
    [resolvedTheme, accentColor],
  );

  const context: StartContext = {
    site: { url: site.url, title: site.title, timezone, locale: site.locale },
    user: { id: user.id, role: user.roles[0]?.name ?? '' },
    theme,
    session: { revision: session.revision },
    path,
  };
  // Read when the page connects, so it starts with Admin as it is then.
  const contextRef = useRef(context);
  contextRef.current = context;
  // The session outlives navigations, so it mustn't depend on a navigate that may not.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Made without side effects: those start when the frame mounts, and end when it does.
  const frameSession = useMemo(
    () =>
      createAppFrameSession({
        surfaceOrigin,
        context: () => contextRef.current,
        fetchAdminApi: createAdminApiFetch({ apiRoot: new URL(apiUrl('/')), ghostVersion }),
        navigate: (next, { replace }) => navigateRef.current(appPathRoute(id, next), { replace }),
        open: (place) => navigateRef.current(placeRoute(place)),
      }),
    [ghostVersion, id, surfaceOrigin],
  );
  const { status, title, attempt, startedAt } = useSyncExternalStore(
    frameSession.subscribe,
    frameSession.getState,
  );

  useAppTitle(manifest.name, title);

  // Back, forward or a link moved Admin within the app: the app follows, without reloading.
  useEffect(() => frameSession.pathChanged(path), [frameSession, path]);
  useEffect(() => frameSession.themeChanged(theme), [frameSession, theme]);

  if (status === 'failed') {
    return (
      <NotResponding
        installation={installation}
        startedAt={startedAt}
        onRetry={frameSession.restart}
      />
    );
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
        ref={frameSession.attach}
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
 * or by the site's address failing to load. Nor before the staff user is known, so the
 * app never starts without knowing who is using it. The origin check is of the URL the
 * frame starts from; `isGhostOrigin` says what it doesn't cover.
 */
const ActiveApp: React.FC<{ session: AppSession; onEnded: () => void }> = ({
  session,
  onEnded,
}) => {
  const { installation } = session;
  const site = useBrowseSite({ defaultErrorHandler: false });
  const settings = useBrowseSettings({ defaultErrorHandler: false });
  // Reports its own failure, as Admin's other screens rely on it doing.
  const user = useCurrentUser();
  const error = site.error ?? settings.error;
  useEffect(() => {
    if (error) {
      reportAppsError(error);
    }
  }, [error]);
  if (!site.data || !settings.data || !user.data) {
    let failure: { message: string; retry: () => unknown } | undefined;
    if (site.error) {
      failure = {
        message: 'Couldn’t load the site’s address, which opening an app needs.',
        retry: site.refetch,
      };
    } else if (settings.error) {
      failure = {
        message: 'Couldn’t load the site’s settings, which opening an app needs.',
        retry: settings.refetch,
      };
    } else if (user.error) {
      failure = {
        message: 'Couldn’t load your account, which opening an app needs.',
        retry: user.refetch,
      };
    }
    return (
      <Centered>
        {failure ? (
          <Stack align="center" gap="md">
            <Text tone="secondary">{failure.message}</Text>
            <Button variant="outline" onClick={() => void failure.retry()}>
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
      user={user.data}
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
  const queryClient = useQueryClient();
  const fetchApi = useFetchApi();
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
    const queryKey = getAppInstallationQueryKey(installationId, SESSION_END_SEARCH_PARAMS);

    // The installation as it stands is what the session's end is told by, so it goes
    // where that read looks: it is read again only when the tab comes back into focus.
    // One request per open.
    const startSession = async (): Promise<AppSession | undefined> => {
      try {
        const session = (await start(installationId)).app_sessions[0];
        if (session) {
          queryClient.setQueryData<AppInstallationsResponseType>(queryKey, {
            app_installations: [session.installation],
          });
        }
        return session;
      } catch (error) {
        if (!isSessionsRouteMissing(error)) {
          throw error;
        }
      }

      // Admin and Core deploy independently, so this Admin may be talking to a Core from
      // before app sessions, which has no route for them. The app opens as it did there:
      // on the installation as read, without a re-check, pinned to the revision read.
      const [, url] = queryKey;
      const read = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => fetchApi<AppInstallationsResponseType>(url),
        staleTime: 0,
      });
      const installation = read.app_installations[0];
      // That Core's installations may not carry a revision either; theirs never moves on.
      return installation && { revision: installation.revision ?? 0, installation };
    };

    startSession().then(
      (session) => setResult({ key, session }),
      (error: unknown) => setResult({ key, error }),
    );
  }, [fetchApi, installationId, key, queryClient, start]);

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
