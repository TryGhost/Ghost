import React from 'react';
import {
  Banner,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { AppBanner, AppIcon } from '@/apps/components/app-icon';
import { DevelopmentBadge } from '@/apps/components/development-badge';
import { isDevelopmentApp } from '@/apps/lib/served-from';

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
export const ReviewHeader: React.FC<{
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
export const ReviewSeparator: React.FC = () => <Separator className="-mx-6 w-auto" />;

/** Why this review replaced the one the publisher was looking at. */
export const NoticeBanner: React.FC<{ notice?: string }> = ({ notice }) =>
  notice ? (
    <Banner data-testid="app-install-notice" size="md" variant="info">
      <Text as="p" size="sm">
        {notice}
      </Text>
    </Banner>
  ) : null;
