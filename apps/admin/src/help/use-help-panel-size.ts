import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';

/*
 * The docked Help panel's size: beside the page, or maximized, taking over
 * the whole page area right of Admin's sidebar, for reading long articles.
 * Desktop only; on mobile the panel is a full sheet. The button is in
 * help-panel-size.tsx, and help-panel.tsx sizes the panel.
 */

/** The panel's width beside the page, in pixels. */
export const PANEL_WIDTH = 440;

/** The widest its content gets when maximized, so lines stay readable. */
export const MAXIMIZED_COLUMN_WIDTH = 800;

export function useHelpPanelSize(open: boolean) {
  const [maximized, setMaximized] = useState(false);

  // Each time the panel opens, it opens beside the page
  useEffect(() => {
    if (!open) {
      setMaximized(false);
    }
  }, [open]);

  const toggleMaximized = useCallback(() => setMaximized((current) => !current), []);

  return { maximized, toggleMaximized };
}

export type HelpPanelSize = ReturnType<typeof useHelpPanelSize>;

/** The panel's size, for its headers' maximize button; null where it can't change (mobile). */
export const HelpPanelSizeContext = createContext<HelpPanelSize | null>(null);

/**
 * How wide the maximized panel is: from where the page beside it starts (the
 * inset, a <main>) to the window's edge. Measured rather than 100%, which
 * would also count Admin's sidebar and push the panel's right side out of
 * view. Re-measured when the layout or the page changes size, eg. the
 * sidebar pinning or the window resizing; null when not maximized.
 */
export function useMaximizedWidth(asideRef: RefObject<HTMLElement | null>, maximized: boolean) {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const layout = asideRef.current?.parentElement;
    const page = layout?.querySelector(':scope > main');
    if (!maximized || !layout || !page) {
      setWidth(null);
      return;
    }
    const measure = () =>
      setWidth(layout.getBoundingClientRect().right - page.getBoundingClientRect().left);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout);
    observer.observe(page);
    return () => observer.disconnect();
  }, [asideRef, maximized]);

  return width;
}
