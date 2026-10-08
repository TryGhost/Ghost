import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SettingsSectionId } from './sections';

export interface OpenSubview {
  id: SettingsSectionId;
  /** The pane's heading, which names the panel while the pane is open. */
  title: string;
}

export interface SubviewController {
  open: OpenSubview | null;
  /** The section the panel was asked to show; the pane with this id opens itself. */
  requested: SettingsSectionId | null;
  show: (subview: OpenSubview) => void;
  close: () => void;
  /** Shows a section: opens its pane if it has one, and otherwise returns to the section list. */
  reveal: (id: SettingsSectionId) => void;
}

export const SubviewContext = createContext<SubviewController | null>(null);

/**
 * The sidebar's one open pane. The panel owns it, so closing the panel or
 * leaving the editor unmounts the state rather than carrying it forward.
 */
export function useSubviewController(): SubviewController {
  const [open, setOpen] = useState<OpenSubview | null>(null);
  const [requested, setRequested] = useState<SettingsSectionId | null>(null);
  const close = useCallback(() => {
    // Removing a focused field does not fire blur. Commit it before the pane
    // unmounts, just as clicking the back button does.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement) {
      focused.blur();
    }
    setRequested(null);
    setOpen(null);
  }, []);
  const show = useCallback((subview: OpenSubview) => {
    setRequested(null);
    setOpen(subview);
  }, []);
  // Another pane hides every other section, the requested one's row included.
  const reveal = useCallback(
    (id: SettingsSectionId) => {
      if (open && open.id !== id) {
        close();
      }
      setRequested(id);
    },
    [close, open],
  );

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

  return useMemo(
    () => ({ open, requested, show, close, reveal }),
    [close, open, requested, reveal, show],
  );
}

export function useSubviews(): SubviewController {
  const controller = useContext(SubviewContext);

  if (!controller) {
    throw new Error('A settings subview must be rendered inside the settings panel.');
  }

  return controller;
}
