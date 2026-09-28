import React from 'react';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { LucideIcon, useGlobalDirtyState } from '@tryghost/shade/utils';
import { useExitSettings } from '@/settings/hooks/use-exit-settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

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
      <Button
        aria-label={admin7Settings ? 'Back to app' : 'Close settings'}
        className={
          admin7Settings
            ? 'size-(--control-height) shrink-0 rounded-full'
            : 'text-muted-foreground hover:text-foreground'
        }
        data-testid="exit-settings"
        id={admin7Settings ? undefined : 'done-button'}
        size="icon"
        title={admin7Settings ? 'Back to app (ESC)' : 'Close (ESC)'}
        type="button"
        variant={admin7Settings ? 'outline' : 'ghost'}
        onClick={() => confirm(isDirty, navigateAway)}
      >
        {admin7Settings ? <LucideIcon.ArrowLeft /> : <LucideIcon.X className="size-6!" />}
      </Button>
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

export default ExitSettingsButton;
