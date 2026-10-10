import React from 'react';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { LucideIcon, useGlobalDirtyState } from '@tryghost/shade/utils';
import { useExitSettings } from '@/settings/hooks/use-exit-settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { FullscreenCloseButton } from '@/shared/fullscreen-close-button';

const ExitSettingsButton: React.FC = () => {
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const exitSettings = useExitSettings();
  const admin7Settings = useFeatureFlag('admin7settings');

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
          onClick={() => confirm(isDirty, exitSettings)}
        >
          <LucideIcon.ArrowLeft />
        </Button>
      ) : (
        <FullscreenCloseButton
          aria-label="Close settings"
          data-testid="exit-settings"
          id="done-button"
          title="Close (ESC)"
          onClick={() => confirm(isDirty, exitSettings)}
        />
      )}
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

export default ExitSettingsButton;
