import { useCallback, useState } from 'react';

const STORAGE_KEY = 'ghost-editor-settings-sidebar';

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'open';
  } catch {
    return false;
  }
}

function writeStoredOpen(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? 'open' : 'closed');
  } catch {
    // A full or blocked localStorage costs the preference, not the toggle.
  }
}

export interface SettingsSidebarState {
  isOpen: boolean;
  toggle: () => void;
}

/** Whether the settings sidebar is open, remembered for the next post opened. */
export function useSettingsSidebar(): SettingsSidebarState {
  const [isOpen, setIsOpen] = useState(readStoredOpen);

  const toggle = useCallback(() => {
    setIsOpen((open) => {
      writeStoredOpen(!open);
      return !open;
    });
  }, []);

  return { isOpen, toggle };
}
