import React, { useState } from 'react';
import { toast } from 'sonner';
import { isOutdatedReviewCode } from '@tryghost/app-contracts';
import { useNavigate } from '@tryghost/admin-x-framework';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { AlreadyInstalled } from './already-installed';
import { Failed } from './failed';
import { Loading } from './loading';
import { Review } from './review';
import { ReviewDialog } from './review-dialog';
import { REVIEW_CHANGED } from './review-header';
import { type InstallFailure, apiErrorOf, installFailureOf } from '@/apps/lib/install-failure';
import { appRoute } from '@/apps/lib/routes';
import { useInstallFlow } from '@/apps/lib/use-install-flow';

/** Ghost puts the review it fetched instead in a 409's `details`, which is typed `unknown`. */
function isPreview(value: unknown): value is AppInstallationPreview {
  const preview = value as Partial<AppInstallationPreview> | null;
  return (
    typeof preview?.manifest_url === 'string' &&
    typeof preview.digest === 'string' &&
    Array.isArray(preview.manifest?.surfaces) &&
    preview.installation !== undefined
  );
}

/**
 * The install link's screen. Ghost fetches and checks the app's manifest, the publisher reviews
 * it, and confirming installs the app, or moves the site's installation to this link, exactly as
 * reviewed. An app the site already has from this link isn't reviewed here: its page is.
 */
export const InstallDialog: React.FC<{ manifestUrl: string | null }> = ({ manifestUrl }) => {
  const navigate = useNavigate();
  const { preview, reload, replace, confirm, isConfirming } = useInstallFlow(manifestUrl);
  const [notice, setNotice] = useState<string>();
  // Kept while shown, so Try again confirms the same review.
  const [confirmFailure, setConfirmFailure] = useState<InstallFailure>();

  const close = () => navigate('/apps', { replace: true });
  const open = (installationId: string) => navigate(appRoute(installationId), { replace: true });

  const confirmReviewed = async (reviewed: AppInstallationPreview) => {
    setConfirmFailure(undefined);
    try {
      const installed = await confirm(reviewed);
      const { name } = reviewed.manifest;
      toast.success(reviewed.installation ? `Changes to ${name} approved` : `${name} installed`);
      if (installed) {
        open(installed.id);
      } else {
        close();
      }
    } catch (error) {
      const apiError = apiErrorOf(error);
      const code = apiError?.code;
      if (isOutdatedReviewCode(code)) {
        // Only a changed manifest or installation can carry the current review; otherwise
        // fetch it.
        setNotice(REVIEW_CHANGED);
        const details: unknown = apiError?.details;
        const sendsReview = code === 'APP_MANIFEST_CHANGED' || code === 'APP_INSTALLATION_CHANGED';
        if (sendsReview && isPreview(details)) {
          replace(details);
        } else {
          await reload();
        }
      } else {
        setConfirmFailure(installFailureOf(error));
      }
    }
  };

  let content: React.ReactNode;
  const reviewed = preview.data;
  const current = reviewed?.installation;
  if (!manifestUrl) {
    content = <Failed attempted="check" failure={{ kind: 'incomplete-link' }} onClose={close} />;
  } else if (preview.isFetching || !reviewed) {
    content = preview.error ? (
      <Failed
        attempted="check"
        failure={installFailureOf(preview.error)}
        onClose={close}
        onRetry={() => void reload()}
      />
    ) : (
      <Loading />
    );
  } else if (confirmFailure) {
    content = (
      <Failed
        attempted={current ? 'approve' : 'install'}
        failure={confirmFailure}
        onClose={close}
        onRetry={() => void confirmReviewed(reviewed)}
      />
    );
  } else if (!current || current.manifest_url !== reviewed.manifest_url) {
    content = (
      <Review
        // An install that turns out to be a move starts afresh, as another screen would.
        key={current ? 'approve' : 'install'}
        isConfirming={isConfirming}
        notice={notice}
        preview={reviewed}
        onClose={close}
        onConfirm={() => void confirmReviewed(reviewed)}
      />
    );
  } else {
    content = (
      <AlreadyInstalled installation={current} onClose={close} onOpen={() => open(current.id)} />
    );
  }

  return (
    <ReviewDialog locked={isConfirming} onClose={close}>
      {content}
    </ReviewDialog>
  );
};
