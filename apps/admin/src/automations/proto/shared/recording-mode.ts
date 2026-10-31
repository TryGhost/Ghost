import { useSyncExternalStore } from 'react';

// Record mode: the prototype dressed for a screen recording, like a changelog
// screencast. On, the sidebar shows the prototype as the product — one
// "Automations" item with the shipping icon, where there are normally two (the
// real screens and "Automations (Proto)"). Anything else a recording needs
// changed belongs behind the same flag.
//
// It used to hide the lane switcher's beaker too. The beaker now hides itself
// all the time and appears from the bottom-right corner (see lane-switcher), so
// it's out of shot either way.
//
// ⌘⇧. (Ctrl+Shift+. elsewhere) toggles it on any prototype screen — the lane
// switcher listens — and the switcher's ⋯ menu has it as a row with that hint.
// Chosen because browsers don't bind it (⌘⇧H and ⌘⇧B both are).
//
// Kept in this browser (localStorage) so it survives reloads and lane changes
// mid-recording, and affects nobody else. Exported through the automations
// api.ts, because the sidebar reads it and the shell may only reach a domain
// through its api.

const STORAGE_KEY = 'automations-proto:recording-mode';

export const RECORDING_MODE_SHORTCUT = '⌘⇧.';

// event.code, so the key reads the same whichever modifiers are held and on
// any keyboard layout.
export const isRecordingModeShortcut = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'Period';

const listeners = new Set<() => void>();

const read = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

let recordingMode = typeof window === 'undefined' ? false : read();

export const setRecordingMode = (next: boolean): void => {
  recordingMode = next;
  try {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (a private window): it still holds for the session.
  }
  listeners.forEach((listener) => listener());
};

export const toggleRecordingMode = (): void => setRecordingMode(!recordingMode);

export const useRecordingMode = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => recordingMode,
    () => false,
  );
