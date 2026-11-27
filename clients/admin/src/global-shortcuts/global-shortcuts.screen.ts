import { isMacPlatform } from '@/utils/is-mac-platform';
import type { GlobalShortcut } from './global-shortcuts';

const KEYS: Record<GlobalShortcut, { key: string; code: string }> = {
  openSettings: { key: ',', code: 'Comma' },
  save: { key: 's', code: 'KeyS' },
};

/** App-wide shortcut gestures for acceptance specs; no assertions. */
export const globalShortcutsScreen = {
  /** Presses Cmd (Mac) or Ctrl plus the shortcut's key and reports whether anything handled it. */
  press(shortcut: GlobalShortcut): boolean {
    const isMac = isMacPlatform();
    const event = new KeyboardEvent('keydown', {
      ...KEYS[shortcut],
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  },
};
