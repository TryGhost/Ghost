import React from 'react';
import {
  Banner,
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { ACCOUNT_ACCESS_INTRO, AccessIndicator } from '@/apps/components/access-indicator';
import { AppBanner, AppIcon } from '@/apps/components/app-icon';
import { DevelopmentBadge } from '@/apps/components/development-badge';
import { ManifestChanges } from '@/apps/components/manifest-changes';
import { SectionEyebrow } from '@/apps/components/section-eyebrow';
import { CapabilitySummary } from '@/apps/components/surface-icon';
import { ACCOUNT_ACCESS } from '@/apps/lib/access';
import { describeChanges } from '@/apps/lib/changes';
import { isDevelopmentApp, movedBetween } from '@/apps/lib/served-from';

/** What the review is for: a new install, changes to approve, or nothing to do. */
function reviewKind(preview: AppInstallationPreview) {
  const { installation } = preview;
  if (!installation) {
    return 'install';
  }
  return installation.changes.length || installation.status !== 'active' ? 'approve' : 'current';
}

/**
 * Who made the app: the same for installing and approving. Where it runs is listed with
 * what it can access, as a place it sends data to.
 */
const AppIdentity: React.FC<{ preview: AppInstallationPreview }> = ({ preview }) => {
  const { manifest } = preview;
  return (
    <Inline gap="xs">
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
      {isDevelopmentApp(manifest) && <DevelopmentBadge />}
    </Inline>
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

/** The app as Ghost fetched it, for the publisher to install or approve. */
export const Review: React.FC<ReviewProps> = ({
  preview,
  notice,
  isConfirming,
  onClose,
  onConfirm,
}) => {
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
        <DialogHeader className="gap-3">
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
    return (
      <>
        <ReviewHeader
          description={`${name} has changed. The changes take effect once you approve them.`}
          preview={preview}
          title={`Review changes to ${name}`}
        />
        {noticeBanner}
        {move && (
          // Anyone can make an install link with an installed app's ID, so a move is the
          // one change that could hand the app's place on this site to someone else.
          <Banner data-testid="app-install-move-warning" size="md" variant="warning">
            <Text as="p" size="sm">
              This moves {name} from {move.from} to {move.to}. Only approve it if you or the app’s
              developer moved the app.
            </Text>
          </Banner>
        )}
        <CapabilitySummary manifest={manifest} />
        <ReviewSeparator />
        {rows.length > 0 && (
          <Stack gap="sm">
            <SectionEyebrow>What changed</SectionEyebrow>
            <ManifestChanges rows={rows} />
          </Stack>
        )}
        <AccessIndicator intro={ACCOUNT_ACCESS_INTRO} items={ACCOUNT_ACCESS} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isConfirming} onClick={onConfirm}>
            Approve changes
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <ReviewHeader description={manifest.description} preview={preview} title={manifest.name} />
      {noticeBanner}
      <CapabilitySummary manifest={manifest} />
      <ReviewSeparator />
      <AccessIndicator intro={ACCOUNT_ACCESS_INTRO} items={ACCOUNT_ACCESS} />
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
