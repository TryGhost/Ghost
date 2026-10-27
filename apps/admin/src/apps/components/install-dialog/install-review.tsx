import React from 'react';
import { Button, DialogFooter } from '@tryghost/shade/components';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { NoticeBanner, ReviewHeader, ReviewSeparator } from './review-header';
import { ACCOUNT_ACCESS_INTRO, AccessIndicator } from '@/apps/components/access-indicator';
import { CapabilitySummary } from '@/apps/components/surface-icon';
import { ACCOUNT_ACCESS } from '@/apps/lib/access';

export interface ReviewProps {
  preview: AppInstallationPreview;
  notice?: string;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** An app the site doesn't have yet, as Ghost fetched it, for the publisher to install. */
export const InstallReview: React.FC<ReviewProps> = ({
  preview,
  notice,
  isConfirming,
  onClose,
  onConfirm,
}) => {
  const { manifest } = preview;
  return (
    <>
      <ReviewHeader description={manifest.description} preview={preview} title={manifest.name} />
      <NoticeBanner notice={notice} />
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
