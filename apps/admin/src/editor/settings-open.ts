/**
 * Whether the post settings panel is open, remembered in this browser across
 * every post and page. The editor opens with the panel as the writer last left
 * it with the Settings toggle; a panel the editor opens itself, to show a field
 * a save refused, is not remembered.
 */

/** One state for all posts and pages, stored as `open` or `closed`. */
export const SETTINGS_OPEN_KEY = 'ghost-editor-settings-open';

/** Reading `localStorage` can throw where storage is blocked. */
type StorageSource = () => Storage;

const browserStorage: StorageSource = () => window.localStorage;

/** Whether the writer last left the panel open. Missing, unreadable or unknown values read as closed. */
export function readSettingsOpen(storage: StorageSource = browserStorage): boolean {
  try {
    return storage().getItem(SETTINGS_OPEN_KEY) === 'open';
  } catch {
    return false;
  }
}

export function writeSettingsOpen(open: boolean, storage: StorageSource = browserStorage): void {
  try {
    storage().setItem(SETTINGS_OPEN_KEY, open ? 'open' : 'closed');
  } catch {
    // A full or blocked localStorage costs the memory, not the toggle.
  }
}

/**
 * Whether the editor opens with the panel open. Where the panel would cover the
 * editor it always starts closed, so the writer lands on their post.
 */
export function settingsOpenAtStart({
  overlay,
  stored,
}: {
  /** The panel overlays the editor rather than sitting beside it. */
  overlay: boolean;
  stored: boolean;
}): boolean {
  return !overlay && stored;
}

/**
 * Whether the writer's toggle is remembered. A toggle where the panel overlays
 * the editor is not, since that panel never opens with the editor.
 */
export function remembersSettingsToggle({ overlay }: { overlay: boolean }): boolean {
  return !overlay;
}
