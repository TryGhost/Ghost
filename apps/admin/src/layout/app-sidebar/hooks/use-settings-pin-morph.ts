import { useCallback, useState } from 'react';

export interface SettingsPinMorph {
  morphStyle: 'bump' | 'ease';
  onPinnedMorphEnd: () => void;
}

/**
 * How the floating sidebar morphs as Settings pins and unpins it (`pinning`:
 * it's unpinned outside Settings). Settings' pin is the screen's, not the
 * user's, so the capsule grows to full height, and shrinks back, on a plain
 * ease rather than the bump of the user's own pin; the body swaps its
 * navigation alongside. The ease holds until the capsule has finished
 * morphing, whichever way the route last went.
 */
export function useSettingsPinMorph(
  settingsNavigation: boolean,
  pinning: boolean,
): SettingsPinMorph {
  const [state, setState] = useState({ settings: settingsNavigation, easing: false });

  // Follows the route in the same render, so the pin starts on the ease
  let current = state;
  if (current.settings !== settingsNavigation) {
    current = { settings: settingsNavigation, easing: pinning };
    setState(current);
  }

  const onPinnedMorphEnd = useCallback(() => {
    setState((previous) => (previous.easing ? { ...previous, easing: false } : previous));
  }, []);

  return { morphStyle: current.easing ? 'ease' : 'bump', onPinnedMorphEnd };
}
