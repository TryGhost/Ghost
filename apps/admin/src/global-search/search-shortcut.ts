import { isMacPlatform } from '@/utils/is-mac-platform';

export const searchShortcutLabel = isMacPlatform() ? '⌘K' : 'Ctrl+K';

/** Cmd+K on a Mac, Ctrl+K elsewhere, with no other modifier. */
export function isSearchShortcut(event: KeyboardEvent, isMac: boolean = isMacPlatform()): boolean {
  if (event.isComposing) {
    return false;
  }

  const modifier = isMac ? event.metaKey : event.ctrlKey;
  const otherModifier = isMac ? event.ctrlKey : event.metaKey;
  const key = event.key.toLowerCase();
  // the physical K key counts only when its layout types a non-Latin character
  const isK = key === 'k' || (!/^[a-z]$/.test(key) && event.code === 'KeyK');

  return modifier && !otherModifier && !event.altKey && !event.shiftKey && isK;
}
