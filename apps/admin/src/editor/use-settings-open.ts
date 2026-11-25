import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  readSettingsOpen,
  remembersSettingsToggle,
  settingsOpenAtStart,
  writeSettingsOpen,
} from './settings-open';

/** Below Shade's `lg` breakpoint, where the panel's frame overlays the editor instead of sitting beside it. */
const OVERLAY_SCREEN = '(width < 1024px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(OVERLAY_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useOverlayScreen() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(OVERLAY_SCREEN).matches);
}

export interface SettingsOpenMemory {
  /** Whether the panel opens with the editor. Decided once, as the editor opens. */
  openAtStart: boolean;
  /**
   * The panel is still the one the editor opened with, which mounts in place
   * rather than sliding in. Ends with the writer's first toggle.
   */
  restored: boolean;
  /** Records the writer's own toggle with the state it leaves the panel in. */
  toggled: (open: boolean) => void;
}

/**
 * The settings panel's remembered open state. The start is decided from the
 * screen width in the first render and never revisited, so nothing moves on its
 * own after the editor has opened.
 *
 * The start is local, so use this once (the editor screen).
 */
export function useSettingsOpen(): SettingsOpenMemory {
  const overlay = useOverlayScreen();
  const [openAtStart] = useState(() =>
    settingsOpenAtStart({ overlay, stored: readSettingsOpen() }),
  );
  const [restored, setRestored] = useState(openAtStart);

  // Read when the writer toggles, against the width at that moment.
  const latest = useRef({ overlay });
  useEffect(() => {
    latest.current = { overlay };
  }, [overlay]);

  const toggled = useCallback((open: boolean) => {
    setRestored(false);
    if (remembersSettingsToggle(latest.current)) {
      writeSettingsOpen(open);
    }
  }, []);

  return { openAtStart, restored, toggled };
}
