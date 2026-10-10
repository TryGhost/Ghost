import { startTransition, useEffect, useLayoutEffect, useState } from 'react';
import { useSettingsSidebarMorphing } from '@/layout/settings-navigation';
import { useLazyComponent } from '@/shared/use-lazy-component';
import { SettingsLoading } from './settings-loading';
import { resetSettingsSpinner } from './settings-loading-state';
import { loadSettingsScreen } from './load-settings-screen';

/**
 * Mounts Settings as soon as it is navigated to, so the shell swaps to the
 * Settings navigation straight away; Settings' own code loads behind a spinner.
 * While the floating sidebar grows to show the navigation, Settings mounts a
 * frame later, as a transition, so the morph starts first.
 */
export default function SettingsRoute() {
  useLayoutEffect(resetSettingsSpinner, []);
  const SettingsScreen = useLazyComponent(loadSettingsScreen);
  const sidebarMorphing = useSettingsSidebarMorphing();
  const [deferred, setDeferred] = useState(sidebarMorphing);
  useEffect(() => {
    if (!deferred || !SettingsScreen) {
      return;
    }
    const frame = requestAnimationFrame(() => startTransition(() => setDeferred(false)));
    return () => cancelAnimationFrame(frame);
  }, [deferred, SettingsScreen]);

  if (!SettingsScreen) {
    return <SettingsLoading />;
  }
  return deferred ? null : <SettingsScreen />;
}
