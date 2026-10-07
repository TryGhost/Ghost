import React from 'react';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { useGlobalDirtyState } from '@tryghost/shade/utils';
import { useNavigate } from '@tryghost/admin-x-framework';
import { FullscreenCloseButton } from '@/shared/fullscreen-close-button';

const ExitSettingsButton: React.FC = () => {
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const navigate = useNavigate();

  const navigateAway = () => {
    navigate('/');
  };

  return (
    <>
      <FullscreenCloseButton
        aria-label="Close settings"
        data-testid="exit-settings"
        id="done-button"
        title="Close (ESC)"
        onClick={() => confirm(isDirty, navigateAway)}
      />
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

export default ExitSettingsButton;
