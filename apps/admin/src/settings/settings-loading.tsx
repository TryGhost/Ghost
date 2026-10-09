import { LoadingIndicator } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { useState } from 'react';
import { hasSettingsSpinnerShown, markSettingsSpinnerShown } from './settings-loading-state';

/** The main area while Settings' code loads: a spinner that only shows if loading takes a moment. */
export function SettingsLoading() {
  const [immediate] = useState(hasSettingsSpinnerShown);
  return (
    <Stack
      align="center"
      className={immediate ? 'h-full' : 'delayed-fade-in h-full'}
      justify="center"
      role="status"
      onAnimationStart={markSettingsSpinnerShown}
    >
      <LoadingIndicator size="lg" />
      <span className="sr-only">Loading settings</span>
    </Stack>
  );
}
