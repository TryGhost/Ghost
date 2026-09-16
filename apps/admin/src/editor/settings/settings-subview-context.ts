import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SettingsSectionId } from './sections';

export interface OpenSubview {
  id: SettingsSectionId;
  /** The pane's heading, which names the panel while the pane is open. */
  title: string;
  /** The pane needs more room than the section list does. */
  wide: boolean;
}

export interface SubviewController {
  open: OpenSubview | null;
  show: (subview: OpenSubview) => void;
  close: () => void;
}

export const SubviewContext = createContext<SubviewController | null>(null);

/**
 * The sidebar's one open pane. The panel owns it, so closing the panel or
 * leaving the editor unmounts the state rather than carrying it forward.
 */
export function useSubviewController(): SubviewController {
  const [open, setOpen] = useState<OpenSubview | null>(null);
  const close = useCallback(() => {
    // Removing a focused field does not fire blur. Commit it before the pane
    // unmounts, just as clicking the back button does.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement) {
      focused.blur();
    }
    setOpen(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // A dialog, select or uploader inside the pane answers Escape first, and
      // Radix marks that by preventing the default rather than stopping here.
      if (event.key === 'Escape' && !event.defaultPrevented) {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, open]);

  return useMemo(() => ({ open, show: setOpen, close }), [close, open]);
}

export function useSubviews(): SubviewController {
  const controller = useContext(SubviewContext);

  if (!controller) {
    throw new Error('A settings subview must be rendered inside the settings panel.');
  }

  return controller;
}
