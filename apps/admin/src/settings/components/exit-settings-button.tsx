import React from 'react';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { LucideIcon, useGlobalDirtyState } from '@tryghost/shade/utils';
import { useExitSettings } from '@/settings/hooks/use-exit-settings';

const ExitSettingsButton: React.FC = () => {
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const exitSettings = useExitSettings();

  return (
    <>
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
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

export default ExitSettingsButton;
