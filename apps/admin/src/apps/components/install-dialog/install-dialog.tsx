import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@tryghost/shade/components';
import { toast } from 'sonner';
import { useNavigate } from '@tryghost/admin-x-framework';
import {
  type AppInstallationPreview,
  useAddAppInstallation,
  useApproveAppInstallation,
  usePreviewAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { Checking } from './checking';
import { Failed } from './failed';
import { Review } from './review';
import { type InstallFailure, apiErrorOf, installFailureOf } from '@/apps/lib/install-failure';

type InstallState =
  | { status: 'checking' }
  /**
   * `preview` and `notice` are set when confirming a review failed, so trying again
   * confirms the same review, shown as it was.
   */
  | {
      status: 'failed';
      failure: InstallFailure;
      preview?: AppInstallationPreview;
      notice?: string;
    }
  | { status: 'reviewing'; preview: AppInstallationPreview; notice?: string };

/** Shown on a review that replaced the one the publisher was looking at. */
const CHANGED =
  'This app has changed since you opened it. Review the latest version before continuing.';

/** Whether a 409's details are the preview Ghost fetched instead, as the API documents. */
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
  const { mutateAsync: previewApp } = usePreviewAppInstallation();
  const { mutateAsync: installApp, isPending: isInstalling } = useAddAppInstallation();
  const { mutateAsync: approveApp, isPending: isApproving } = useApproveAppInstallation();
  const [state, setState] = useState<InstallState>({ status: 'checking' });
  // Only the latest check may update the screen, so a slow answer never replaces a newer one.
  const latestCheck = useRef(0);

  const check = useCallback(
    async (notice?: string) => {
      latestCheck.current += 1;
      const run = latestCheck.current;
      setState({ status: 'checking' });
      if (!manifestUrl) {
        setState({ status: 'failed', failure: { kind: 'incomplete-link' } });
        return;
      }
      try {
        const response = await previewApp(manifestUrl);
        if (run === latestCheck.current) {
          setState({
            status: 'reviewing',
            preview: response.app_installation_previews[0],
            notice,
          });
        }
      } catch (error) {
        if (run === latestCheck.current) {
          setState({ status: 'failed', failure: installFailureOf(error) });
        }
      }
    },
    [manifestUrl, previewApp],
  );

  // Checks each install link once, including when React runs effects twice in development:
  // every check makes Ghost fetch the app's manifest.
  const checkedUrl = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (checkedUrl.current === manifestUrl) {
      return;
    }
    checkedUrl.current = manifestUrl;
    void check();
  }, [check, manifestUrl]);

  const close = () => navigate('/apps', { replace: true });

  const confirm = async (preview: AppInstallationPreview, notice?: string) => {
    const reviewed = { manifest_url: preview.manifest_url, digest: preview.digest };
    try {
      if (preview.installation) {
        await approveApp({
          id: preview.installation.id,
          revision: preview.installation.revision,
          ...reviewed,
        });
        toast.success(`Changes to ${preview.manifest.name} approved`);
      } else {
        await installApp(reviewed);
        toast.success(`${preview.manifest.name} installed`);
      }
      navigate('/apps', { replace: true });
    } catch (error) {
      const apiError = apiErrorOf(error);
      const code = apiError?.code;
      // The app, or the site's installation of it, is no longer what was reviewed. Ghost
      // answers with the review as it stands now when it has one; otherwise ask for it.
      if (code === 'APP_MANIFEST_CHANGED' || code === 'APP_INSTALLATION_CHANGED') {
        const details: unknown = apiError?.details;
        if (isPreview(details)) {
          setState({ status: 'reviewing', preview: details, notice: CHANGED });
        } else {
          await check(CHANGED);
        }
      } else if (code === 'APP_ALREADY_INSTALLED' || code === 'APP_INSTALLATION_UNINSTALLED') {
        // Installed, or uninstalled, under the publisher: a fresh review of where it stands.
        await check(CHANGED);
      } else {
        setState({ status: 'failed', failure: installFailureOf(error), preview, notice });
      }
    }
  };

  let content: React.ReactNode;
  if (state.status === 'checking') {
    content = <Checking />;
  } else if (state.status === 'failed') {
    const { preview: failedPreview, notice } = state;
    content = (
      <Failed
        attempted={failedPreview ? (failedPreview.installation ? 'approve' : 'install') : 'check'}
        failure={state.failure}
        onClose={close}
        onRetry={() => {
          if (failedPreview) {
            // Back to the review while it confirms again, as the first attempt did.
            setState({ status: 'reviewing', preview: failedPreview, notice });
            void confirm(failedPreview, notice);
          } else {
            void check();
          }
        }}
      />
    );
  } else {
    content = (
      <Review
        isConfirming={isInstalling || isApproving}
        notice={state.notice}
        preview={state.preview}
        onClose={close}
        onConfirm={() => void confirm(state.preview, state.notice)}
      />
    );
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
