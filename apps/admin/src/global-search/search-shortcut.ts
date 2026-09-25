import { isMacPlatform } from '@/utils/is-mac-platform';

export const searchShortcutLabel = isMacPlatform() ? '⌘K' : 'Ctrl+K';

/** Cmd+K on a Mac, Ctrl+K elsewhere, with no other modifier. */
export function isSearchShortcut(event: KeyboardEvent, isMac: boolean = isMacPlatform()): boolean {
  const modifier = isMac ? event.metaKey : event.ctrlKey;
  const otherModifier = isMac ? event.ctrlKey : event.metaKey;

  if (!modifier || otherModifier || event.altKey || event.shiftKey || event.isComposing) {
    return false;
  }

  // autofill sends keydown events without a key
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
  // the physical K key counts only when its layout types a non-Latin character
  return key === 'k' || (!/^[a-z]$/.test(key) && event.code === 'KeyK');
}
