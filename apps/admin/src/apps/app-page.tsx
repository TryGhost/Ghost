import React, { useEffect, useRef, useState } from 'react';
import { Button, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { Link, useParams } from '@tryghost/admin-x-framework';
import {
  type AppInstallation,
  useReadAppInstallation,
  useRefreshAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { APIError, getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { AppsGate } from './components/apps-gate';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX, appFrameTimeouts, isGhostOrigin } from './lib/frame';
import { InstallDialog } from './components/install-dialog/install-dialog';
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
      <details className="w-full border-t pt-3 text-left text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium">Details</summary>
        <div className="mt-2 rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed">
          No response from {servedFrom(installation.manifest)}
          <br />
          Started {startedAt.toLocaleTimeString()}
        </div>
      </details>
    </Stack>
  </Centered>
);

/**
 * The app's page, loaded from its own URL in a sandboxed frame. Ready means the frame has
 * loaded; knowing the app itself is up comes with the bridge (BER-3983), which also
 * replaces this with a handshake. A page that can't be reached, or doesn't load in time,
 * gets the not-responding state, and the rest of Admin stays usable either way.
 */
const AppFrame: React.FC<{ installation: AppInstallation }> = ({ installation }) => {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [reached, setReached] = useState(false);
  const [failed, setFailed] = useState(false);
  const [startedAt, setStartedAt] = useState(() => new Date());
  const url = appPageUrl(installation.manifest);
  // Ready once the frame has loaded and the app is known to have answered.
  const ready = loaded && reached;
  const status: FrameStatus = failed ? 'failed' : ready ? 'ready' : 'loading';

  // While the page is awaited: a clock, and a probe. Both stop the moment it's ready, so
  // nothing can call the page unresponsive after that.
  useEffect(() => {
    if (ready) {
      return;
    }
    const timer = window.setTimeout(() => setFailed(true), appFrameTimeouts.ready);
    // The frame's load event fires for the browser's own error page too, so it can't say
    // whether the app answered. This request can: a server that can't be reached rejects
    // it, while any answer at all, even a 405 to HEAD, resolves it opaque.
    const probe = new AbortController();
    // eslint-disable-next-line no-restricted-syntax -- the app's own page, not Ghost's API
    fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: probe.signal,
    }).then(
      () => setReached(true),
      () => {
        if (!probe.signal.aborted) {
          setFailed(true);
        }
      },
    );
    return () => {
      window.clearTimeout(timer);
      probe.abort();
    };
  }, [attempt, url, ready]);

  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setReached(false);
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
        allow={APP_FRAME_ALLOW}
        aria-hidden={status !== 'ready'}
        // Hidden, not transparent: a frame that's still loading mustn't take focus or clicks.
        className={status === 'ready' ? 'size-full' : 'invisible size-full'}
        data-testid="app-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={APP_FRAME_SANDBOX}
        src={url}
        title={installation.manifest.name}
        onLoad={() => setLoaded(true)}
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
 * or by the site's address failing to load.
 */
const ActiveApp: React.FC<{ installation: AppInstallation }> = ({ installation }) => {
  const { data: site, error, refetch } = useBrowseSite({ defaultErrorHandler: false });
  if (!site) {
    return (
      <Centered>
        {error ? (
          <Stack align="center" gap="md">
            <Text tone="secondary">
              {getErrorMessage(
                error,
                'Couldn’t load the site’s address, which opening an app needs.',
              )}
            </Text>
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </Stack>
        ) : (
          <LoadingIndicator size="md" />
        )}
      </Centered>
    );
  }
  const ghostUrls = [window.location.href, site.site.url];
  if (isGhostOrigin(appPageUrl(installation.manifest), ghostUrls)) {
    return <NotFramed installation={installation} />;
  }
  return <AppFrame key={installation.id} installation={installation} />;
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
 * Has Ghost re-check the app's manifest once, when the page opens, before anything of the
 * app is served (BER-4036). What it finds decides what the page shows: a silent change
 * applies, a change that needs approval suspends the app. Ghost keeps the approved
 * manifest when the app can't be reached, so a failed refresh falls back to what is read.
 */
function useRefreshOnOpen(installationId: string): {
  settled: boolean;
  /** The installation as the refresh left it, when Ghost answered. */
  refreshed?: AppInstallation;
  /** Starts over, as a new session does: after approving changes, the app loads afresh. */
  restart: () => void;
} {
  const { mutateAsync: refresh } = useRefreshAppInstallation();
  const [session, setSession] = useState(0);
  const [result, setResult] = useState<{ key: string; refreshed?: AppInstallation }>();
  const started = useRef<string | null>(null);
  const key = `${installationId}:${session}`;

  useEffect(() => {
    if (!installationId || started.current === key) {
      return;
    }
    started.current = key;
    refresh(installationId)
      .then((response) => setResult({ key, refreshed: response.app_installations[0] }))
      .catch(() => setResult({ key }));
  }, [installationId, key, refresh]);

  const restart = () => setSession((value) => value + 1);
  return result?.key === key
    ? { settled: true, refreshed: result.refreshed, restart }
    : { settled: false, restart };
}

/**
 * `/apps/:installationId/*`. Only an active installation loads, once its manifest has
 * been re-checked; the rest of the path is left for the app's own pages, which the bridge
 * will pass on (BER-3983).
 */
export const AppPage: React.FC = () => {
  const { installationId = '' } = useParams();
  const { settled, refreshed, restart } = useRefreshOnOpen(installationId);
  const { data, error, isLoading, refetch } = useReadAppInstallation(installationId, {
    defaultErrorHandler: false,
  });
  // What the refresh found comes first: it is what Ghost will serve from now on.
  const installation = refreshed ?? data?.app_installations[0];

  let body: React.ReactNode;
  if (!settled && !(error instanceof APIError && error.response?.status === 404)) {
    body = (
      <Centered>
        <LoadingIndicator size="md" />
      </Centered>
    );
  } else if (installation?.status === 'active') {
    body = <ActiveApp installation={installation} />;
  } else if (installation?.status === 'suspended') {
    body = <NeedsApproval installation={installation} onApproved={restart} />;
  } else if (installation || (error instanceof APIError && error.response?.status === 404)) {
    body = <NotInstalled />;
  } else if (error) {
    body = (
      <Centered>
        <Stack align="center" gap="md">
          <Text tone="secondary">
            {getErrorMessage(error, 'Couldn’t load this app. Please try again.')}
          </Text>
          <Button variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </Stack>
      </Centered>
    );
  } else if (isLoading) {
    body = (
      <Centered>
        <LoadingIndicator size="md" />
      </Centered>
    );
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
