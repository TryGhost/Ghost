import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery } from '@tanstack/react-query';
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
  useRouterDestination,
} from '@tryghost/admin-x-framework';
import {
  type AppInstallation,
  type AppInstallationsResponseType,
  type AppSession,
  appInstallationPath,
  useBrowseAppInstallations,
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
import { usePageTitle } from '@/hooks/use-document-title';
import { useThemeContext } from '@/providers/theme-context';
import { AppsGate } from './components/apps-gate';
import { InstallDialog, type InstallDone } from './components/install-dialog/install-dialog';
import { createAppFrameSession } from './lib/app-frame-session';
import { appEntryPath, appPathFromLocation, appPathRoute, isAppLocation } from './lib/app-path';
import { createAdminApiFetch } from './lib/bridge-fetch';
import { placeRoute } from './lib/bridge-places';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX, isGhostOrigin } from './lib/frame';
import {
  isInstallationNotFound,
  isSessionsRouteMissing,
  sessionFailureOf,
  type SessionFailure,
} from './lib/not-found';
import { reportAppsError } from './lib/report-error';
import { appRoute } from './lib/routes';
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
 * Shown when Ghost couldn't use the app's manifest as the session started. The session's response
 * has no installation, so the app's name comes from the list the sidebar reads.
 *
 * There's no Uninstall here. When Ghost couldn't confirm the app, uninstalling it and installing
 * it again from a link is the one way another developer's key gets pinned, so the screen sends the
 * publisher to the developer instead. Uninstall stays on the app's details page.
 */
const Unavailable: React.FC<{
  installationId: string;
  failure: SessionFailure;
  onRetry: () => void;
}> = ({ installationId, failure, onRetry }) => {
  const { data } = useBrowseAppInstallations({ defaultErrorHandler: false });
  const installation = data?.app_installations.find(({ id }) => id === installationId);
  const name = installation?.manifest.name ?? 'This app';
  const at = installation ? ` at ${servedFrom(installation.manifest)}` : '';
  const explanation = failure.unconfirmed
    ? `Ghost couldn’t confirm the app${at} is the one you installed. Contact its developer, and don’t install it again from a link until they’ve fixed it. Your site isn’t affected.`
    : `Ghost couldn’t load the app${at}. It might be down or misconfigured. Your site isn’t affected.`;
  return (
    <Centered testId="app-unavailable">
      <EmptyIndicator
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/apps">Back to Apps</Link>
            </Button>
            <Button onClick={onRetry}>Try again</Button>
          </>
        }
        description={
          <>
            {explanation}
            <span className="mt-2 block font-mono text-xs" data-testid="app-failure-code">
              {failure.code}
            </span>
          </>
        }
        title={
          failure.unconfirmed
            ? `Ghost couldn’t confirm this is ${installation?.manifest.name ?? 'the app you installed'}`
            : `${name} isn’t available right now`
        }
      >
        <LucideIcon.TriangleAlert />
      </EmptyIndicator>
    </Centered>
  );
};

/** Returns the number of the app navigation an Admin location was created for, if any. */
function appMoveOf(state: unknown): number | undefined {
  const move = (state as { appMove?: unknown } | null)?.appMove;
  return typeof move === 'number' ? move : undefined;
}

/**
 * Shows the app page's title as the document title while the page is open, once the page has set
 * one. Admin's own title comes back when the page closes.
 */
function useAppTitle(appName: string, title: string | undefined) {
  usePageTitle(title === undefined ? undefined : title ? `${title} · ${appName}` : appName);
}

const SESSION_END_SEARCH_PARAMS: Record<string, string> = {};

/**
 * Ends the session when a fresh read of the installation shows a higher revision than the one the
 * session started with. The app would then be running an unapproved manifest, or nothing at all.
 * Only a read made during this session counts, and only a higher revision ends it. Revisions only
 * increase, so a read sent before the session started that arrives after it shows a lower revision.
 *
 * This only sees changes this tab reads. Changes made in another tab, or by another staff user, are
 * left to the app token that comes with Permissions and auth.
 *
 * Ghost versions from before app sessions don't give installations a revision, so there's nothing
 * to compare, and nothing is read.
 */
function useSessionEnd(session: AppSession, onEnded: () => void) {
  const [since] = useState(() => Date.now());
  const started = session.installation.revision;
  const { data, dataUpdatedAt, isFetching } = useReadAppInstallation(session.installation.id, {
    enabled: started !== undefined,
    defaultErrorHandler: false,
    // Without the history the details page shows; this one has no use for it.
    searchParams: SESSION_END_SEARCH_PARAMS,
    // The session's response already includes the current installation, so opening the page doesn't
    // read it again. This only fills an empty cache. Anything a previous session left there is
    // older than `since`.
    initialData: { app_installations: [session.installation] },
    refetchOnMount: false,
    // A change made in the meantime shows up when the publisher comes back to the tab. TanStack
    // Query reacts to the tab becoming visible again, not to the window regaining focus, so a
    // change made in another window side by side isn't seen until the page next opens.
    refetchOnWindowFocus: 'always',
  });
  const revision = data?.app_installations[0]?.revision;
  useEffect(() => {
    if (
      !isFetching &&
      dataUpdatedAt >= since &&
      started !== undefined &&
      revision !== undefined &&
      revision > started
    ) {
      onEnded();
    }
  }, [dataUpdatedAt, isFetching, onEnded, revision, started, since]);
}

/**
 * The app's page, loaded from its own URL in a sandboxed frame and connected to Admin by the
 * bridge. The frame stays hidden until the app has started, which is what the `ready` status means.
 * A page that never sends a hello, or doesn't start in time, gets the not-responding state, and the
 * rest of Admin stays usable either way. `createAppFrameSession` handles all of that. This
 * component renders the session's state and keeps the session updated with Admin's location.
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

  const entryPath = appEntryPath(url);
  const path = appPathFromLocation(id, location, entryPath);
  const move = appMoveOf(location.state);
  const theme = useMemo<Theme>(
    () => ({ mode: resolvedTheme, accent_color: accentColor }),
    [resolvedTheme, accentColor],
  );

  const context: StartContext = {
    site: { url: site.url, title: site.title, timezone, locale: site.locale },
    user: { id: user.id, role: user.roles[0]?.name ?? '' },
    theme,
    session: { revision: installation.revision ?? 0 },
    path,
  };
  // Read when the page connects, so the app starts with Admin's context at that moment.
  const contextRef = useRef(context);
  contextRef.current = context;
  // The session outlives navigations, so it mustn't hold on to a `navigate` that may not.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // Where Admin is going when the app asks to navigate. If that's away from the app, the publisher
  // started the navigation, and the app mustn't override it by navigating Admin itself. Read from
  // the router when the app asks, because React may not have rendered a navigation that has started
  // or finished. The router stays the same for the whole session.
  const routerDestination = useRouterDestination();
  const navigateForApp = (to: string, options?: { replace?: boolean; state?: unknown }) => {
    const destination = routerDestination();
    if (destination !== undefined && !isAppLocation(id, { pathname: destination })) {
      return false;
    }
    navigateRef.current(to, options);
    return true;
  };

  // Created once per `AppFrame`. A second session would bind to a frame whose page has already sent
  // its hello, and would mark the app unresponsive. Its inputs don't change: a new installation or
  // URL remounts `AppFrame` by key, and Ghost's version is fixed while Admin runs. Side effects
  // start and stop with the frame, through `attach`, the frame's ref, not an effect: Strict Mode's
  // double effects would end a live session.
  const [frameSession] = useState(() =>
    createAppFrameSession({
      surfaceOrigin,
      context: () => contextRef.current,
      fetchAdminApi: createAdminApiFetch({ apiRoot: new URL(apiUrl('/')), ghostVersion }),
      navigate: (next, { replace, move: appMove }) =>
        navigateForApp(appPathRoute(id, next, entryPath), { replace, state: { appMove } }),
      open: (place) => navigateForApp(placeRoute(place)),
    }),
  );
  const { status, title, attempt, startedAt } = useSyncExternalStore(
    frameSession.subscribe,
    frameSession.getState,
  );
  // Each load of the frame opens the app's page at the app's current route, so a reload of Admin,
  // or coming back to the app, shows the page the publisher was on, also in a multi-page app. The
  // address is fixed for the life of the frame: changing it would reload the page.
  const [frameSource, setFrameSource] = useState(() => ({ attempt, src: new URL(path, url).href }));
  if (frameSource.attempt !== attempt) {
    setFrameSource({ attempt, src: new URL(path, url).href });
  }

  useAppTitle(manifest.name, title);

  // Runs for every location, keyed by `location.key`. React Router commits in a transition, so a
  // location it commits can lag behind the app, which may have moved on since, and quick moves can
  // merge into one location on a route Admin was already on. The move markers tell those apart
  // from Admin's own navigations.
  useEffect(() => frameSession.pathChanged(path, move), [frameSession, location.key, path, move]);
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
        src={frameSource.src}
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
 * or by the site's address failing to load. Nothing is framed before the staff user is known
 * either, so the app never starts without knowing who is using it. The origin check applies
 * to the URL the frame starts from; `isGhostOrigin` describes what it doesn't cover.
 */
const ActiveApp: React.FC<{ session: AppSession; onEnded: () => void }> = ({
  session,
  onEnded,
}) => {
  const { installation } = session;
  const site = useBrowseSite({ defaultErrorHandler: false });
  const settings = useBrowseSettings({ defaultErrorHandler: false });
  // This hook reports its own failure, which Admin's other screens rely on.
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
  const surfaceOrigin = new URL(appPageUrl(installation.manifest)).origin;
  return (
    <AppFrame
      // The frame's session is created for one installation at one origin.
      key={`${installation.id} ${surfaceOrigin}`}
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
 * A suspended app doesn't load. The review of its changes opens over the page straight away. The
 * page behind it explains why, and has a button to reopen the review once it's closed.
 *
 * Approving starts a new session. So does a review that finds the changes already approved, for
 * example from another tab. If the review finds the app was uninstalled in the meantime, it offers
 * a fresh install, which creates a new installation. If it finds the app was reinstalled in the
 * meantime, it has found a different installation. Either way, the page opens that installation
 * instead.
 */
const NeedsApproval: React.FC<{ installation: AppInstallation; onApproved: () => void }> = ({
  installation,
  onApproved,
}) => {
  const navigate = useNavigate();
  const [reviewing, setReviewing] = useState(true);
  const onDone = (done: InstallDone | undefined) => {
    if (done && done.installationId !== installation.id) {
      navigate(appRoute(done.installationId), { replace: true });
    } else {
      onApproved();
    }
  };
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
          onDone={onDone}
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
 * Starts a session of the app when the page opens, and again on `restart`. Ghost first re-checks
 * the app's manifest, and only its response decides what the page shows. No part of the app loads
 * before then. Ghost versions from before app sessions can't re-check, so a plain read of the
 * installation decides instead.
 */
function useAppSession(installationId: string): {
  settled: boolean;
  session?: AppSession;
  error?: unknown;
  /** Ends this session and starts a new one, for example after approving changes. */
  restart: () => void;
} {
  const fetchApi = useFetchApi();
  const { mutateAsync: start } = useStartAppSession();
  const [generation, setGeneration] = useState(0);

  // One start per open and per restart. Each start is its own query that never goes stale, isn't
  // retried, and is removed once nothing renders it.
  const { data, error, isPending } = useQuery({
    queryKey: ['app-session', installationId, generation],
    // `null` when there's nothing to open, because a query can't return `undefined`.
    queryFn: async (): Promise<AppSession | null> => {
      try {
        return (await start(installationId)).app_sessions[0] ?? null;
      } catch (startError) {
        if (!isSessionsRouteMissing(startError)) {
          throw startError;
        }
      }

      // Admin and Core deploy independently, so this Admin may be talking to a Core from before app
      // sessions, which has no route for them. The app then opens as it did before sessions: from a
      // plain read of the installation, without a re-check, and pinned to the revision that read
      // returned.
      const read = await fetchApi<AppInstallationsResponseType>(
        apiUrl(appInstallationPath(installationId)),
      );
      const installation = read.app_installations[0];
      // That Core's installations may not have a revision either. The app then gets revision 0,
      // which never changes.
      return installation ? { installation } : null;
    },
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const restart = useCallback(() => setGeneration((value) => value + 1), []);
  return { settled: !isPending, session: data ?? undefined, error: error ?? undefined, restart };
}

/**
 * `/apps/:installationId/*`. Only an active installation loads, in its own session. The rest of the
 * path is the app's own route, which the bridge passes to the app.
 */
export const AppPage: React.FC = () => {
  const { installationId = '' } = useParams();
  const { settled, session, error, restart } = useAppSession(installationId);
  const installation = session?.installation;
  const notFound = isInstallationNotFound(error);
  const failure = sessionFailureOf(error);
  const appFailed = failure !== undefined;
  useEffect(() => {
    if (error && !notFound && !appFailed) {
      reportAppsError(error);
    }
  }, [error, notFound, appFailed]);

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
  } else if (failure) {
    body = <Unavailable failure={failure} installationId={installationId} onRetry={restart} />;
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
    // Not found, uninstalled, or an empty response: the only thing to show is the way back.
    body = <NotInstalled />;
  }

  // Ghost keeps only the nav; the rest is the app's, edge to edge. Like Admin's own screens,
  // the app brings its page gutter (Shade's page templates do), so it can bleed a sticky
  // header or a scrolling row to the edge.
  return (
    <div className="size-full" data-testid="app-page">
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
