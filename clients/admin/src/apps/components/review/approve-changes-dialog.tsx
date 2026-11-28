import React, { useState } from 'react';
import { toast } from 'sonner';
import { isOutdatedReviewCode } from '@tryghost/app-contracts';
import {
  type ApprovalPreview,
  useApproveAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { Failed } from './failed';
import { Review } from './review';
import { ReviewDialog } from './review-dialog';
import { REVIEW_CHANGED } from './review-header';
import { type InstallFailure, apiErrorOf, installFailureOf } from '@/apps/lib/install-failure';

interface ApproveChangesDialogProps {
  preview: ApprovalPreview;
  /** Whether this review replaced one Ghost refused to approve as outdated. */
  afterOutdatedReview: boolean;
  onClose: () => void;
  onApproved: () => void;
  /** Ghost refused the approval because the app or its installation changed since the review. */
  onOutdated: () => void;
}

/** The review of a suspended app's pending manifest, approving exactly what was reviewed. */
export const ApproveChangesDialog: React.FC<ApproveChangesDialogProps> = ({
  preview,
  afterOutdatedReview,
  onClose,
  onApproved,
  onOutdated,
}) => {
  const approve = useApproveAppInstallation();
  const [failure, setFailure] = useState<InstallFailure>();

  const approveReviewed = async () => {
    setFailure(undefined);
    const { id, revision } = preview.installation;
    try {
      await approve.mutateAsync({
        id,
        revision,
        manifest_url: preview.manifest_url,
        digest: preview.digest,
      });
    } catch (error) {
      const code = apiErrorOf(error)?.code;
      if (isOutdatedReviewCode(code)) {
        onOutdated();
      } else {
        setFailure(installFailureOf(error));
      }
      return;
    }
    toast.success(`Changes to ${preview.manifest.name} approved`);
    onApproved();
  };

  return (
    <ReviewDialog locked={approve.isPending} onClose={onClose}>
      {failure ? (
        <Failed
          attempted="approve"
          failure={failure}
          onClose={onClose}
          onRetry={() => void approveReviewed()}
        />
      ) : (
        <Review
          isConfirming={approve.isPending}
          notice={afterOutdatedReview ? REVIEW_CHANGED : undefined}
          preview={preview}
          onClose={onClose}
          onConfirm={() => void approveReviewed()}
        />
      )}
    </ReviewDialog>
  );
};
