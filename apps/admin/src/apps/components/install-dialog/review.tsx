import React from 'react';
import { Button, DialogFooter } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { isFieldChange } from '@tryghost/app-contracts';
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
  const name = installation?.manifest.name;
  // Access changes are shown with the app's access, not among the field rows.
  const rows = installation
    ? describeChanges(installation, preview, installation.changes.filter(isFieldChange))
    : [];
  return (
    <>
      <ReviewHeader
        description={
          installation
            ? `${name} has changed. The changes take effect once you approve them.`
            : manifest.description
        }
        preview={preview}
        title={installation ? `Review changes to ${name}` : manifest.name}
      />
      <NoticeBanner notice={notice} />
      <CapabilitySummary manifest={manifest} />
      <ReviewSeparator />
      {rows.length > 0 && (
        <Stack gap="sm">
          <SectionEyebrow>What changed</SectionEyebrow>
          <ManifestChanges rows={rows} />
        </Stack>
      )}
      <AccessIndicator manifest={manifest} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isConfirming} onClick={onConfirm}>
          {installation ? 'Approve changes' : 'Install'}
        </Button>
      </DialogFooter>
    </>
  );
};
