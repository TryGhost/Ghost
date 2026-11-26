import React from 'react';
import { Button, DialogFooter } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { splitChanges } from '@tryghost/app-contracts';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { NoticeBanner, ReviewHeader, ReviewSeparator } from './review-header';
import { AccessIndicator } from '@/apps/components/access-indicator';
import { ManifestChanges } from '@/apps/components/manifest-changes';
import { SectionEyebrow } from '@/apps/components/section-eyebrow';
import { CapabilitySummary } from '@/apps/components/surface-icon';
import { describeChanges } from '@/apps/lib/changes';

interface ReviewProps {
  preview: AppInstallationPreview;
  notice?: string;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * An app for the publisher to install, or, when the site has it, its changes to approve, as
 * Ghost fetched it.
 */
export const Review: React.FC<ReviewProps> = ({
  preview,
  notice,
  isConfirming,
  onClose,
  onConfirm,
}) => {
  const { manifest, installation } = preview;
  // Scope changes are marked in the access list, not rows among the fields.
  const { fields, scopes } = splitChanges(installation?.changes ?? []);
  const rows = installation ? describeChanges(installation, preview, fields) : [];
  // Above the separator is the app as it stands: an installed app stays as it was approved until
  // its changes are. The sections below say what needs review.
  const current = installation ?? preview;
  return (
    <>
      <ReviewHeader app={current}>
        <NoticeBanner notice={notice} />
        <CapabilitySummary manifest={current.manifest} />
        <ReviewSeparator />
      </ReviewHeader>
      {rows.length > 0 && (
        <Stack gap="sm">
          <SectionEyebrow>What changed</SectionEyebrow>
          <ManifestChanges rows={rows} />
        </Stack>
      )}
      <AccessIndicator
        changes={scopes}
        manifest={manifest}
        reviewingUpdate={Boolean(installation)}
      />
      <DialogFooter>
        <Button disabled={isConfirming} variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isConfirming} onClick={onConfirm}>
          {installation ? 'Approve changes' : 'Install'}
        </Button>
      </DialogFooter>
    </>
  );
};
