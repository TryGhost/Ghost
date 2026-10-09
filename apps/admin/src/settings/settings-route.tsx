import { lazy, Suspense, useLayoutEffect } from 'react';
import { SettingsLoading } from './settings-loading';
import { resetSettingsSpinner } from './settings-loading-state';

const SettingsScreen = lazy(() => import('./settings'));

/**
 * Mounts Settings as soon as it is navigated to, so the shell swaps to the
 * Settings navigation straight away; Settings' own code loads behind a spinner.
 */
export default function SettingsRoute() {
  useLayoutEffect(resetSettingsSpinner, []);
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsScreen />
    </Suspense>
  );
}
