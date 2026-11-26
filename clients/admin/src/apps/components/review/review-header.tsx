import React from 'react';
import {
  Badge,
  Banner,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { AppBanner, AppIcon, type AppIconSource } from '@/apps/components/app-icon';
import { AppAuthor, UnverifiedDeveloperBadge } from '@/apps/components/app-author';

/**
 * Who made the app: the same for installing and approving, with a badge while Ghost hasn’t
 * verified them. Where it runs is listed with what it can access, as a place it sends data to.
 */
const AppIdentity: React.FC<{ manifest: AppManifest }> = ({ manifest }) => {
  return (
    <Inline gap="xs" wrap>
      <Text as="span" size="sm" tone="secondary">
        By <AppAuthor manifest={manifest} emphasised />
      </Text>
      <UnverifiedDeveloperBadge manifest={manifest} />
      {manifest.development && (
        <Badge data-testid="app-development-badge" variant="secondary">
          Development
        </Badge>
      )}
    </Inline>
  );
};

/**
 * The top of a review, for installing and approving alike: the app's color as a band its
 * icon sits into, like a profile picture, then who the app is.
 *
 * `app` is the app as it stands: the manifest being installed, or for an installed app, the one
 * it was approved with, until its changes are approved. `children` follow it a section step
 * apart, closer than the dialog's own gap, as part of the app as it stands.
 */
export const ReviewHeader: React.FC<{ app: AppIconSource; children?: React.ReactNode }> = ({
  app,
  children,
}) => {
  const { manifest } = app;
  return (
    <>
      <AppBanner className="-mx-6 -mt-6 h-28 shrink-0" color={manifest.accent_color} />
      <Stack gap="lg">
        {/* -mt-14 pulls the 64px icon up past the dialog's 24px gap, so half of it
            overlaps the band; its ring matches the dialog to cut out the band. */}
        <DialogHeader className="-mt-14 items-start">
          <AppIcon app={app} className="ring-4 ring-surface-elevated-2" size="xl" />
          <DialogTitle className="mt-3">{manifest.name}</DialogTitle>
          <AppIdentity manifest={manifest} />
          <DialogDescription>{manifest.description}</DialogDescription>
        </DialogHeader>
        {children}
      </Stack>
    </>
  );
};

/** Runs edge to edge, past the dialog's padding, to set the app apart from what it asks. */
export const ReviewSeparator: React.FC = () => <Separator className="-mx-6 w-auto" />;

/** Shown on a review that replaced the one the publisher was looking at. */
export const REVIEW_CHANGED =
  'This app has changed since you opened it. Review the latest version before continuing.';

/** Why this review replaced the one the publisher was looking at. */
export const NoticeBanner: React.FC<{ notice?: string }> = ({ notice }) =>
  notice ? (
    <Banner data-testid="app-install-notice" size="md" variant="info">
      <Text as="p" size="sm">
        {notice}
      </Text>
    </Banner>
  ) : null;
