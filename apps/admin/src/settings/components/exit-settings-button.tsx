import React from 'react';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { LucideIcon, useGlobalDirtyState } from '@tryghost/shade/utils';
import { useExitSettings } from '@/settings/hooks/use-exit-settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { FullscreenCloseButton } from '@/shared/fullscreen-close-button';

interface ExitSettingsButtonProps {
  /** Called after leaving Settings, e.g. to close the mobile sheet the button sits in. */
  onNavigate?: () => void;
}

const ExitSettingsButton: React.FC<ExitSettingsButtonProps> = ({ onNavigate }) => {
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const exitSettings = useExitSettings();
  const admin7Settings = useFeatureFlag('admin7settings');

  const navigateAway = () => {
    exitSettings();
    onNavigate?.();
  };

  return (
    <>
      {admin7Settings ? (
        <Button
          aria-label="Back to app"
          className="size-(--control-height) shrink-0 rounded-full"
          data-testid="exit-settings"
          size="icon"
          title="Back to app (ESC)"
          type="button"
          variant="outline"
          onClick={() => confirm(isDirty, navigateAway)}
        >
          <LucideIcon.ArrowLeft />
        </Button>
      ) : (
        <FullscreenCloseButton
          aria-label="Close settings"
          data-testid="exit-settings"
          id="done-button"
          title="Close (ESC)"
          onClick={() => confirm(isDirty, navigateAway)}
        />
      )}
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

export default ExitSettingsButton;
