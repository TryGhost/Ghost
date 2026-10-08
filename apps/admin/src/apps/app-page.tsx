import React, { useEffect, useState } from 'react';
import { Button, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { Link, useNavigate, useParams } from '@tryghost/admin-x-framework';
import {
  type AppInstallation,
  useReadAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { APIError, getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { AppsGate } from './components/apps-gate';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX, appFrameTimeouts, appPageUrl } from './lib/frame';
import { appReviewRoute } from './lib/routes';
import { servedFrom } from './lib/served-from';

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
          No response from {servedFrom(installation.manifest)} after{' '}
          {Math.round(appFrameTimeouts.ready / 1000)}s
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
 * replaces this with a handshake. A frame that doesn't load in time gets the timeout
 * state, and the rest of Admin stays usable either way.
 */
const AppFrame: React.FC<{ installation: AppInstallation }> = ({ installation }) => {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<FrameStatus>('loading');
  const [startedAt, setStartedAt] = useState(() => new Date());
  const url = appPageUrl(installation.manifest);

  useEffect(() => {
    if (status !== 'loading') {
      return;
    }
    const timer = window.setTimeout(() => setStatus('failed'), appFrameTimeouts.ready);
    return () => window.clearTimeout(timer);
  }, [status, attempt]);

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
        allow={APP_FRAME_ALLOW}
        className={status === 'ready' ? 'size-full' : 'size-full opacity-0'}
        data-testid="app-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={APP_FRAME_SANDBOX}
        src={url}
        title={installation.manifest.name}
        onLoad={() => setStatus('ready')}
      />
    </div>
  );
};

/** A suspended app doesn't load: the page says why and leads to the review. */
const NeedsApproval: React.FC<{ installation: AppInstallation }> = ({ installation }) => {
  const navigate = useNavigate();
  return (
    <Centered testId="app-needs-approval">
      <EmptyIndicator
        actions={
          <Button onClick={() => navigate(appReviewRoute(installation.manifest_url))}>
            Review changes
          </Button>
        }
        description="It’s been updated and needs your approval before it can open."
        title={`${installation.manifest.name} needs approval`}
      >
        <LucideIcon.ShieldAlert />
      </EmptyIndicator>
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
 * `/apps/:installationId/*`. Only an active installation loads; the rest of the path is
 * left for the app's own pages, which the bridge will pass on (BER-3983).
 */
export const AppPage: React.FC = () => {
  const { installationId = '' } = useParams();
  const { data, error, isLoading, refetch } = useReadAppInstallation(installationId, {
    defaultErrorHandler: false,
  });
  const installation = data?.app_installations[0];

  let body: React.ReactNode;
  if (installation?.status === 'active') {
    body = <AppFrame key={installation.id} installation={installation} />;
  } else if (installation?.status === 'suspended') {
    body = <NeedsApproval installation={installation} />;
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
