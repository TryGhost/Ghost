import React, { useState } from 'react';
import { Dialog, DialogContent } from '@tryghost/shade/components';
import { toast } from 'sonner';
import { useNavigate } from '@tryghost/admin-x-framework';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { AlreadyInstalled } from './already-installed';
import { ApproveReview } from './approve-review';
import { Failed } from './failed';
import { InstallReview } from './install-review';
import { Loading } from './loading';
import { type InstallFailure, apiErrorOf, installFailureOf } from '@/apps/lib/install-failure';
import { appRoute } from '@/apps/lib/routes';
import { useInstallFlow } from '@/apps/lib/use-install-flow';

/** Shown on a review that replaced the one the publisher was looking at. */
const CHANGED =
  'This app has changed since you opened it. Review the latest version before continuing.';

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
 * The install link's screen. Ghost fetches and checks the app's manifest, the publisher
 * reviews it, and confirming installs or approves exactly the version they reviewed.
 */
export const InstallDialog: React.FC<{ manifestUrl: string | null }> = ({ manifestUrl }) => {
  const navigate = useNavigate();
  const { preview, reload, replace, confirm, isConfirming } = useInstallFlow(manifestUrl);
  const [notice, setNotice] = useState<string>();
  // Kept while shown, so Try again confirms the same review.
  const [confirmFailure, setConfirmFailure] = useState<InstallFailure>();

  const close = () => navigate('/apps', { replace: true });

  const confirmReviewed = async (reviewed: AppInstallationPreview) => {
    setConfirmFailure(undefined);
    try {
      const installed = await confirm(reviewed);
      const { name } = reviewed.manifest;
      toast.success(reviewed.installation ? `Changes to ${name} approved` : `${name} installed`);
      // A fresh install opens the app; approving changes stays where it was managed.
      navigate(installed ? appRoute(installed.id) : '/apps', { replace: true });
    } catch (error) {
      const apiError = apiErrorOf(error);
      const code = apiError?.code;
      if (code === 'APP_MANIFEST_CHANGED' || code === 'APP_INSTALLATION_CHANGED') {
        // The app, or the site's installation of it, is no longer what was reviewed. Ghost
        // answers with the review as it stands now when it has one; otherwise ask for it.
        setNotice(CHANGED);
        const details: unknown = apiError?.details;
        if (isPreview(details)) {
          replace(details);
        } else {
          await reload();
        }
      } else if (code === 'APP_ALREADY_INSTALLED' || code === 'APP_INSTALLATION_UNINSTALLED') {
        // Installed, or uninstalled, under the publisher: a fresh review of where it stands.
        setNotice(CHANGED);
        await reload();
      } else {
        setConfirmFailure(installFailureOf(error));
      }
    }
  };

  let content: React.ReactNode;
  const reviewed = preview.data;
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
        attempted={reviewed.installation ? 'approve' : 'install'}
        failure={confirmFailure}
        onClose={close}
        onRetry={() => void confirmReviewed(reviewed)}
      />
    );
  } else if (!reviewed.installation) {
    content = (
      <InstallReview
        isConfirming={isConfirming}
        notice={notice}
        preview={reviewed}
        onClose={close}
        onConfirm={() => void confirmReviewed(reviewed)}
      />
    );
  } else if (reviewed.installation.changes.length || reviewed.installation.status !== 'active') {
    content = (
      <ApproveReview
        installation={reviewed.installation}
        isConfirming={isConfirming}
        notice={notice}
        preview={reviewed}
        onClose={close}
        onConfirm={() => void confirmReviewed(reviewed)}
      />
    );
  } else {
    content = <AlreadyInstalled notice={notice} preview={reviewed} onClose={close} />;
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
