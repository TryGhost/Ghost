import React from 'react';
import { Banner, Button, DialogFooter } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import type { ReviewProps } from './install-review';
import { NoticeBanner, ReviewHeader, ReviewSeparator } from './review-header';
import { ACCOUNT_ACCESS_INTRO, AccessIndicator } from '@/apps/components/access-indicator';
import { ManifestChanges } from '@/apps/components/manifest-changes';
import { SectionEyebrow } from '@/apps/components/section-eyebrow';
import { CapabilitySummary } from '@/apps/components/surface-icon';
import { ACCOUNT_ACCESS } from '@/apps/lib/access';
import { describeChanges } from '@/apps/lib/changes';
import { movedBetween } from '@/apps/lib/served-from';

interface ApproveReviewProps extends ReviewProps {
  installation: NonNullable<AppInstallationPreview['installation']>;
}

/** Changes to an app the site has, for the publisher to approve. */
export const ApproveReview: React.FC<ApproveReviewProps> = ({
  preview,
  installation,
  notice,
  isConfirming,
  onClose,
  onConfirm,
}) => {
  const { manifest } = preview;
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
      <NoticeBanner notice={notice} />
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
};
