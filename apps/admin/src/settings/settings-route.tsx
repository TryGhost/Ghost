import { useLayoutEffect } from 'react';
import { useLazyComponent } from '@/shared/use-lazy-component';
import { SettingsLoading } from './settings-loading';
import { resetSettingsSpinner } from './settings-loading-state';

const loadSettingsScreen = () => import('./settings');

/**
 * Mounts Settings as soon as it is navigated to, so the shell swaps to the
 * Settings navigation straight away; Settings' own code loads behind a spinner.
 */
export default function SettingsRoute() {
  useLayoutEffect(resetSettingsSpinner, []);
  const SettingsScreen = useLazyComponent(loadSettingsScreen);
  return SettingsScreen ? <SettingsScreen /> : <SettingsLoading />;
}
