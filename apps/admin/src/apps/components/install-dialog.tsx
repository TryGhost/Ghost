import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingIndicator,
  Separator,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { useNavigate } from '@tryghost/admin-x-framework';
import {
  type AppInstallationPreview,
  useAddAppInstallation,
  useApproveAppInstallation,
  usePreviewAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { AccessIndicator } from './access-indicator';
import { AppBanner, AppIcon } from './app-icon';
import { DevelopmentBadge } from './development-badge';
import { ManifestChanges } from './manifest-changes';
import { SectionEyebrow } from './section-eyebrow';
import { SurfaceSummary } from './surface-icon';
import { STAFF_SESSION_ACCESS } from '@/apps/lib/access';
import { describeChanges } from '@/apps/lib/changes';
import { type InstallFailure, apiErrorOf, installFailureOf } from '@/apps/lib/install-failure';
import { isDevelopmentApp, movedBetween, servedFrom } from '@/apps/lib/served-from';

type InstallState =
  | { status: 'checking' }
  /** `preview` is set when confirming it failed, so trying again confirms it again. */
  | { status: 'failed'; failure: InstallFailure; preview?: AppInstallationPreview }
  | { status: 'reviewing'; preview: AppInstallationPreview; notice?: string };

const CHANGED_WHILE_REVIEWING =
  'This app changed while you were reviewing it. Check it again before you continue.';
const INSTALLATION_CHANGED =
  'Someone else installed or changed this app in the meantime. Here’s where it stands now.';

/** What the review is for: a new install, changes to approve, or nothing to do. */
function reviewKind(preview: AppInstallationPreview) {
  const { installation } = preview;
  if (!installation) {
    return 'install';
  }
  return installation.changes.length || installation.status !== 'active' ? 'approve' : 'current';
}

/** Whether a 409's details are the preview Ghost fetched instead, as the API documents. */
function isPreview(value: unknown): value is AppInstallationPreview {
  const preview = value as Partial<AppInstallationPreview> | null;
  return (
    typeof preview?.manifest_url === 'string' &&
    typeof preview.digest === 'string' &&
    Array.isArray(preview.manifest?.surfaces) &&
    preview.installation !== undefined
  );
}

const Checking: React.FC = () => (
  <Stack align="center" className="py-6" gap="md">
    <LoadingIndicator size="md" />
    <Text size="sm" tone="secondary">
      Checking the app…
    </Text>
    <DialogTitle className="sr-only">Checking the app</DialogTitle>
  </Stack>
);

interface FailedProps {
  failure: InstallFailure;
  /** What failed: checking the app, or installing or approving what was reviewed. */
  attempted: 'check' | 'install' | 'approve';
  onClose: () => void;
  onRetry: () => void;
}

const FAILED_TITLES = {
  check: 'Couldn’t check this app',
  install: 'Couldn’t install this app',
  approve: 'Couldn’t approve the changes',
};

/** Failures that trying again can't fix, as their title and what to do instead. */
const FINAL_FAILURES = {
  problems: {
    title: 'Can’t install this app',
    description:
      'The app’s setup has problems, so nothing was installed. Send these details to the app’s developer.',
  },
  'incomplete-link': {
    title: 'This install link is incomplete',
    description: 'It doesn’t say which app to install. Ask whoever sent it for the full link.',
  },
  unsupported: {
    title: 'This site can’t install apps yet',
    description: 'Apps need a newer version of Ghost. Ask whoever runs this site to update it.',
  },
};

const Failed: React.FC<FailedProps> = ({ failure, attempted, onClose, onRetry }) => {
  if (
    failure.kind === 'problems' ||
    failure.kind === 'incomplete-link' ||
    failure.kind === 'unsupported'
  ) {
    const { title, description } = FINAL_FAILURES[failure.kind];
    return (
      <>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {failure.kind === 'problems' && (
          <ul className="border-t" data-testid="app-install-problems">
            {failure.problems.map((problem) => (
              <li key={`${problem.title}:${problem.detail}`} className="border-b py-3">
                <Text as="div" weight="semibold">
                  {problem.title}
                </Text>
                <Text as="div" className="break-all" size="sm" tone="secondary">
                  {problem.detail}
                </Text>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {failure.kind === 'unreachable' ? 'Can’t reach this app' : FAILED_TITLES[attempted]}
        </DialogTitle>
        <DialogDescription>
          {failure.kind === 'unreachable'
            ? 'It might be down, or having a temporary problem.'
            : failure.message}
        </DialogDescription>
      </DialogHeader>
      {failure.kind === 'unreachable' && failure.detail && (
        <Text
          as="p"
          className="break-all"
          data-testid="app-install-unreachable"
          size="sm"
          tone="secondary"
        >
          {failure.detail}
        </Text>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onRetry}>Try again</Button>
      </DialogFooter>
    </>
  );
};

/** Who the app is and where it runs: the same for installing and approving. */
const AppIdentity: React.FC<{ preview: AppInstallationPreview }> = ({ preview }) => {
  const { manifest } = preview;
  return (
    <Stack gap="none">
      <Inline gap="xs">
        <Text as="span" data-testid="app-install-served-from" size="sm" tone="secondary">
          Runs on {servedFrom(manifest)}
        </Text>
        {isDevelopmentApp(manifest) && <DevelopmentBadge />}
      </Inline>
      <Text as="span" size="sm" tone="secondary">
        By{' '}
        <a
          className="text-foreground hover:underline"
          href={manifest.author.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {manifest.author.name}
        </a>
      </Text>
    </Stack>
  );
};

/**
 * The top of a review, for installing and approving alike: the app's color as a band its
 * icon sits into, like a profile picture, then who the app is and what's being asked.
 */
const ReviewHeader: React.FC<{
  preview: AppInstallationPreview;
  title: string;
  description: string;
}> = ({ preview, title, description }) => {
  const { manifest } = preview;
  return (
    <>
      <AppBanner className="-mx-6 -mt-6 h-28 shrink-0" color={manifest.accent_color} />
      {/* -mt-14 pulls the 64px icon up past the dialog's 24px gap, so half of it
          overlaps the band; its ring matches the dialog to cut out the band. */}
      <DialogHeader className="-mt-14 items-start">
        <AppIcon className="ring-4 ring-surface-elevated-2" manifest={manifest} size="xl" />
        <DialogTitle className="mt-3">{title}</DialogTitle>
        <AppIdentity preview={preview} />
        <DialogDescription className="mt-2">{description}</DialogDescription>
      </DialogHeader>
    </>
  );
};

/** Runs edge to edge, past the dialog's padding, to set the app apart from what it asks. */
const ReviewSeparator: React.FC = () => <Separator className="-mx-6 w-auto" />;

interface ReviewProps {
  preview: AppInstallationPreview;
  notice?: string;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const Review: React.FC<ReviewProps> = ({ preview, notice, isConfirming, onClose, onConfirm }) => {
  const { manifest, installation } = preview;
  const kind = reviewKind(preview);

  const noticeBanner = notice && (
    <Banner data-testid="app-install-notice" size="md" variant="info">
      <Text as="p" size="sm">
        {notice}
      </Text>
    </Banner>
  );

  if (kind === 'current') {
    return (
      <>
        <DialogHeader>
          <Inline gap="md">
            <AppIcon manifest={manifest} size="lg" />
            <DialogTitle>{manifest.name} is already installed</DialogTitle>
          </Inline>
          <DialogDescription>Nothing has changed since it was approved.</DialogDescription>
        </DialogHeader>
        {noticeBanner}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </>
    );
  }

  if (kind === 'approve' && installation) {
    const rows = describeChanges(installation, preview, installation.changes);
    const move = movedBetween(installation, preview);
    const name = installation.manifest.name;
    let description = `${name} has changed. The changes take effect once you approve them.`;
    if (installation.status === 'suspended') {
      description = `${name} has been updated and needs more access. It won’t open until you approve the changes.`;
    }
    return (
      <>
        <ReviewHeader
          description={description}
          preview={preview}
          title={move ? `Move ${name} to ${move.to}?` : `Review changes to ${name}`}
        />
        {noticeBanner}
        {move && (
          // Anyone can make an install link with an installed app's ID, so a move is the
          // one change that could hand the app's place on this site to someone else.
          <Banner data-testid="app-install-move-warning" size="md" variant="warning">
            <Text as="p" size="sm">
              This link moves {name} from {move.from} to {move.to}. Only approve it if you or the
              app’s developer moved the app. Anyone can make a link like this.
            </Text>
          </Banner>
        )}
        <SurfaceSummary manifest={manifest} />
        <ReviewSeparator />
        {rows.length > 0 && (
          <Stack gap="sm">
            <SectionEyebrow>What changed</SectionEyebrow>
            <ManifestChanges rows={rows} />
          </Stack>
        )}
        <AccessIndicator items={[STAFF_SESSION_ACCESS]} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isConfirming} onClick={onConfirm}>
            {move ? 'Approve move' : 'Approve changes'}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <ReviewHeader description={manifest.description} preview={preview} title={manifest.name} />
      {noticeBanner}
      <SurfaceSummary manifest={manifest} />
      <ReviewSeparator />
      <AccessIndicator items={[STAFF_SESSION_ACCESS]} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isConfirming} onClick={onConfirm}>
          Install
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The install link's screen. Ghost fetches and checks the app's manifest, the publisher
 * reviews it, and confirming installs or approves exactly the version they reviewed.
 */
export const InstallDialog: React.FC<{ manifestUrl: string | null }> = ({ manifestUrl }) => {
  const navigate = useNavigate();
  const { mutateAsync: previewApp } = usePreviewAppInstallation();
  const { mutateAsync: installApp, isPending: isInstalling } = useAddAppInstallation();
  const { mutateAsync: approveApp, isPending: isApproving } = useApproveAppInstallation();
  const [state, setState] = useState<InstallState>({ status: 'checking' });
  // Only the latest check may update the screen, so a slow answer never replaces a newer one.
  const latestCheck = useRef(0);

  const check = useCallback(
    async (notice?: string) => {
      latestCheck.current += 1;
      const run = latestCheck.current;
      setState({ status: 'checking' });
      if (!manifestUrl) {
        setState({ status: 'failed', failure: { kind: 'incomplete-link' } });
        return;
      }
      try {
        const response = await previewApp(manifestUrl);
        if (run === latestCheck.current) {
          setState({
            status: 'reviewing',
            preview: response.app_installation_previews[0],
            notice,
          });
        }
      } catch (error) {
        if (run === latestCheck.current) {
          setState({ status: 'failed', failure: installFailureOf(error) });
        }
      }
    },
    [manifestUrl, previewApp],
  );

  // Checks each install link once, including when React runs effects twice in development:
  // every check makes Ghost fetch the app's manifest.
  const checkedUrl = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (checkedUrl.current === manifestUrl) {
      return;
    }
    checkedUrl.current = manifestUrl;
    void check();
  }, [check, manifestUrl]);

  const close = () => navigate('/apps', { replace: true });

  const confirm = async (preview: AppInstallationPreview) => {
    const reviewed = { manifest_url: preview.manifest_url, digest: preview.digest };
    try {
      if (preview.installation) {
        await approveApp({ id: preview.installation.id, ...reviewed });
        // A move confirms where the app runs now.
        const { name } = preview.manifest;
        const move = movedBetween(preview.installation, preview);
        toast.success(move ? `${name} moved to ${move.to}` : `Changes to ${name} approved`);
      } else {
        await installApp(reviewed);
        toast.success(`${preview.manifest.name} installed`);
      }
      navigate('/apps', { replace: true });
    } catch (error) {
      const apiError = apiErrorOf(error);
      if (apiError?.code === 'APP_MANIFEST_CHANGED') {
        // Ghost answers with the version it fetched instead, for a fresh review.
        const details: unknown = apiError.details;
        if (isPreview(details)) {
          setState({ status: 'reviewing', preview: details, notice: CHANGED_WHILE_REVIEWING });
        } else {
          await check(CHANGED_WHILE_REVIEWING);
        }
      } else if (
        apiError?.code === 'APP_ALREADY_INSTALLED' ||
        apiError?.code === 'APP_INSTALLATION_CHANGED'
      ) {
        await check(INSTALLATION_CHANGED);
      } else {
        setState({ status: 'failed', failure: installFailureOf(error), preview });
      }
    }
  };

  let content: React.ReactNode;
  if (state.status === 'checking') {
    content = <Checking />;
  } else if (state.status === 'failed') {
    const failedPreview = state.preview;
    content = (
      <Failed
        attempted={failedPreview ? (failedPreview.installation ? 'approve' : 'install') : 'check'}
        failure={state.failure}
        onClose={close}
        onRetry={() => {
          if (failedPreview) {
            // Back to the review while it confirms again, as the first attempt did.
            setState({ status: 'reviewing', preview: failedPreview });
            void confirm(failedPreview);
          } else {
            void check();
          }
        }}
      />
    );
  } else {
    content = (
      <Review
        isConfirming={isInstalling || isApproving}
        notice={state.notice}
        preview={state.preview}
        onClose={close}
        onConfirm={() => void confirm(state.preview)}
      />
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
      {/* The review is long enough to need its own scroll on short screens. */}
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-md overflow-x-hidden overflow-y-auto"
        data-testid="app-install-dialog"
      >
        {content}
      </DialogContent>
    </Dialog>
  );
};
