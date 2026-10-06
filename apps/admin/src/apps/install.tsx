import React, { useCallback, useEffect, useState } from 'react';
import { AccessIndicator } from './components/access-indicator';
import { STAFF_SESSION_ACCESS } from './lib/access';
import { AppBanner, AppIcon } from './components/app-icon';
import { AppsFlagGate } from './components/apps-flag-gate';
import { AppsListing } from './apps';
import { AskAdminDialog } from './components/ask-admin-dialog';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { type FetchManifestResult, appDeveloper, fetchManifest } from './lib/manifest';
import { findActiveInstallation, installApp } from './lib/installations';
import { canManageApps } from './permissions';
import { pinOnInstall } from './lib/pins';
import { toast } from 'sonner';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import type { AppInstallation } from './types';

type InstallState =
  | { status: 'checking' }
  | { status: 'result'; result: FetchManifestResult; existing?: AppInstallation };

const InstallDialog: React.FC<{ manifestUrl: string | null }> = ({ manifestUrl }) => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const [state, setState] = useState<InstallState>({ status: 'checking' });

  const check = useCallback(async () => {
    setState({ status: 'checking' });
    const result: FetchManifestResult = manifestUrl
      ? await fetchManifest(manifestUrl)
      : {
          ok: false,
          problems: [
            { title: 'No app to install', detail: 'The install link is missing its app.' },
          ],
        };
    const existing =
      result.ok && manifestUrl ? findActiveInstallation(new URL(manifestUrl).href) : undefined;
    setState({ status: 'result', result, existing });
  }, [manifestUrl]);

  useEffect(() => {
    void check();
  }, [check]);

  const close = () => navigate('/apps', { replace: true });

  const confirm = (manifestHref: string) => {
    if (state.status !== 'result' || !state.result.ok) {
      return;
    }
    const installation = installApp(
      manifestHref,
      state.result.manifest,
      currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
    );
    pinOnInstall(installation.id);
    toast.success(`${installation.manifest.name} installed`);
    navigate(`/apps/${installation.id}`, { replace: true });
  };

  let content: React.ReactNode;

  if (state.status === 'checking') {
    content = (
      <Stack align="center" className="py-6" gap="md">
        <LoadingIndicator size="md" />
        <Text size="sm" tone="secondary">
          Checking the app…
        </Text>
        <DialogTitle className="sr-only">Checking the app</DialogTitle>
      </Stack>
    );
  } else if (state.result.ok && state.existing) {
    const { existing } = state;
    content = (
      <>
        <DialogHeader>
          <Inline gap="md">
            <AppIcon
              color={existing.manifest.color}
              icon={existing.manifest.icon}
              size="lg"
              tone="brand"
            />
            <DialogTitle>{existing.manifest.name} is already installed</DialogTitle>
          </Inline>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => navigate(`/apps/${existing.id}`, { replace: true })}>Open</Button>
        </DialogFooter>
      </>
    );
  } else if (state.result.ok) {
    const { manifest } = state.result;
    content = (
      <>
        {/* A band the icon sits into, like a profile picture. */}
        <AppBanner className="-mx-6 -mt-6 h-28" color={manifest.color} />
        {/* -mt-14 pulls the 64px icon up past the dialog's 24px gap, so half of it
            overlaps the band; its ring matches the dialog to cut out the grey. */}
        <DialogHeader className="-mt-14 items-start">
          <AppIcon
            className="ring-4 ring-surface-elevated-2"
            color={manifest.color}
            icon={manifest.icon}
            size="xl"
            tone="brand"
          />
          <DialogTitle className="mt-3">{manifest.name}</DialogTitle>
          <Text data-testid="app-install-source" size="sm" tone="secondary">
            {appDeveloper(manifest)}
          </Text>
          {manifest.description && (
            <DialogDescription className="mt-2">{manifest.description}</DialogDescription>
          )}
        </DialogHeader>
        <AccessIndicator items={[STAFF_SESSION_ACCESS]} />
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => confirm(new URL(manifestUrl ?? '').href)}>Install</Button>
        </DialogFooter>
      </>
    );
  } else if ('unreachable' in state.result) {
    content = (
      <>
        <DialogHeader>
          <DialogTitle>Can’t reach this app</DialogTitle>
          <DialogDescription>
            {state.result.detail} It might be down, or having a temporary problem.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => void check()}>Try again</Button>
        </DialogFooter>
      </>
    );
  } else {
    content = (
      <>
        <DialogHeader>
          <DialogTitle>Can’t install this app</DialogTitle>
          <DialogDescription>
            The app’s setup has problems, so nothing was installed. Send these details to the app’s
            developer.
          </DialogDescription>
        </DialogHeader>
        <ul className="border-t" data-testid="app-install-problems">
          {state.result.problems.map((problem) => (
            <li key={problem.title} className="border-b py-3">
              <Text as="div" weight="semibold">
                {problem.title}
              </Text>
              <Text as="div" size="sm" tone="secondary">
                {problem.detail}
              </Text>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={close}>OK</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <DialogContent className="max-w-md overflow-hidden" data-testid="app-install-dialog">
        {content}
      </DialogContent>
    </Dialog>
  );
};

const AppInstall: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) {
    return null;
  }

  // The install route is open to every staff user so a shared install link
  // explains itself, but only Owners and Administrators reach the Apps list.
  if (!canManageApps(currentUser)) {
    return (
      <AppsFlagGate>
        <AskAdminDialog onClose={() => navigate('/', { replace: true })} />
      </AppsFlagGate>
    );
  }

  return (
    <AppsFlagGate>
      <AppsListing />
      <InstallDialog manifestUrl={searchParams.get('manifest')} />
    </AppsFlagGate>
  );
};

export default AppInstall;
