import React, { type ReactNode } from 'react';
import useCustomFonts from '@/settings/hooks/use-custom-fonts';
import { ConfirmationModalContent } from '@/settings/components/confirmation-modal';
import { type InstalledTheme, useActivateTheme } from '@tryghost/admin-x-framework/api/themes';
import { ThemeValidationIssueList } from './theme-validation-details';
import { describeThemeOutcome, getIssuesFromInstalledTheme } from './theme-validation-issues';
import { getHomepageUrl, useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { toast } from 'sonner';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';

export type ThemeInstalledModalProps = {
  title: string;
  /**
   * Replaces the derived "was uploaded" sentence for flows that didn't upload
   * an archive (marketplace installs, code editor saves). Ignored when the
   * theme is already active, which has its own copy.
   */
  statusMessage?: ReactNode;
  installedTheme: InstalledTheme;
  onActivate?: () => void;
};

const ThemeInstalledModal: React.FC<ThemeInstalledModalProps & { onClose: () => void }> = ({
  title,
  statusMessage,
  installedTheme,
  onActivate,
  onClose,
}) => {
  const { mutateAsync: activateTheme } = useActivateTheme();
  const { refreshActiveThemeData } = useCustomFonts();
  const handleError = useHandleError();
  const { data: siteData } = useBrowseSite();
  const problems = getIssuesFromInstalledTheme(installedTheme);
  const homepageUrl = siteData?.site ? getHomepageUrl(siteData.site) : undefined;

  const okLabel = installedTheme.active ? 'OK' : 'Activate theme';
  const modalTitle = installedTheme.active ? (
    <span className="text-green">It&apos;s live!</span>
  ) : (
    title
  );

  let status: ReactNode;

  if (installedTheme.active) {
    status = (
      <>
        Your theme <strong>{installedTheme.name}</strong> was saved successfully and is now visible
        to your readers.
        {homepageUrl ? (
          <>
            {' '}
            <a
              className="font-semibold text-foreground hover:underline"
              href={homepageUrl}
              rel="noreferrer"
              target="_blank"
            >
              Take a look →
            </a>
          </>
        ) : null}
      </>
    );
  } else if (statusMessage) {
    status = statusMessage;
  } else {
    status = (
      <>
        <strong>{installedTheme.name}</strong> was {describeThemeOutcome('uploaded', problems)}. Do
        you want to activate it?
      </>
    );
  }

  return (
    <ConfirmationModalContent
      cancelLabel="Close"
      okLabel={okLabel}
      okRunningLabel="Activating..."
      okVariant="default"
      prompt={
        <div className="flex flex-col gap-4">
          <p className="text-base text-foreground">{status}</p>
          <ThemeValidationIssueList problems={problems} />
        </div>
      }
      stickyFooter={true}
      title={modalTitle}
      onOk={async (activateModal) => {
        if (!installedTheme.active) {
          try {
            const resData = await activateTheme(installedTheme.name);
            const updatedTheme = resData.themes[0];
            refreshActiveThemeData();

            toast.success('Theme activated', {
              description: (
                <div>
                  <span className="capitalize">{updatedTheme.name}</span> is now your active theme.
                </div>
              ),
            });
          } catch (e) {
            handleError(e);
            return;
          }
        }
        onActivate?.();
        activateModal?.remove();
      }}
      onRemove={onClose}
    />
  );
};

export default ThemeInstalledModal;
