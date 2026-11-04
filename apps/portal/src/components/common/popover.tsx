import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** The space between the panel and the anchor it hangs from. */
const GAP = 6;

/** The space the panel keeps from the edge of what the reader can see. */
const EDGE_MARGIN = 12;

const px = (value: number) => `${value}px`;

export const PopoverStyles = `
    /* Above the popup's back and close buttons (z-index 10000), which a panel that opens above a
       field near the top of the popup reaches. */
    .gh-portal-popover {
        position: absolute;
        z-index: 10001;
        box-sizing: border-box;
    }

    .gh-portal-popover.is-fitted {
        display: flex;
        flex-direction: column;
    }
`;

/**
 * Where a panel is drawn: Portal's popup container, or the anchor's own document's body outside
 * one. Drawn there rather than beside the anchor, so an ancestor that hides its overflow, such as
 * the gift flow's animated reveal, can't clip it.
 */
function getPopoverHost(anchor: HTMLElement): HTMLElement {
  return anchor.closest<HTMLElement>('.gh-portal-popup-container') ?? anchor.ownerDocument.body;
}

/**
 * The top and bottom of what the reader can see around `anchor`: its nearest scrolling ancestor,
 * or the window when it has none. The window alone would report far more room than there is,
 * since Portal's popup is a scrolling box inside a full-height iframe. Null when neither has a
 * height.
 */
function getVisibleBox(anchor: HTMLElement): { top: number; bottom: number } | null {
  const view = anchor.ownerDocument.defaultView;
  for (let el = anchor.parentElement; el && view; el = el.parentElement) {
    const { overflowY } = view.getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return el.getBoundingClientRect();
    }
  }
  const height = view?.innerHeight || anchor.ownerDocument.documentElement.clientHeight;
  return height ? { top: 0, bottom: height } : null;
}

/**
 * A ref holding the `value` of the latest render, so a listener subscribed once calls what the
 * component was last rendered with rather than what it was rendered with when it subscribed.
 */
function useLatest<T>(value: T): React.MutableRefObject<T> {
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  return latest;
}

/**
 * Calls `onEscape` when Escape is pressed in the document `within` belongs to, unless the Escape
 * only cancels what an input method is composing, and marks that Escape handled by preventing its
 * default. Portal's popup closes on an Escape nothing has handled, so an Escape this hook handles
 * leaves the popup open. Listens in the capture phase, so it runs before the popup's listener on
 * the same document whichever of the two subscribed first. Subscribes once per element, however
 * often `onEscape` changes.
 */
export function useEscapeKey(within: React.RefObject<Element>, onEscape: () => void): void {
  const latestOnEscape = useLatest(onEscape);
  useEffect(() => {
    const doc = within.current?.ownerDocument;
    if (!doc) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) {
        return;
      }
      event.preventDefault();
      latestOnEscape.current();
    };
    doc.addEventListener('keydown', onKeyDown, true);
    return () => doc.removeEventListener('keydown', onKeyDown, true);
  }, [within, latestOnEscape]);
}

/** Why a popover asks to close: Escape was pressed, or something outside it was. */
export type PopoverCloseReason = 'escape' | 'outside';

interface PopoverProps extends Pick<
  React.HTMLAttributes<HTMLDivElement>,
  'id' | 'role' | 'className' | 'aria-label' | 'aria-labelledby'
> {
  /** The element the panel hangs from. A press on it isn't one outside the panel. */
  anchor: React.RefObject<HTMLElement>;
  /**
   * How the panel lines up with the anchor: `end` hangs it from the anchor's right edge at its own
   * width, and `stretch` gives it the anchor's width.
   */
  align: 'end' | 'stretch';
  /**
   * Caps the panel's height at the room on the side it opens to, and lays its children out as a
   * column, so a child that scrolls takes whatever room the others leave.
   */
  fit?: boolean;
  onClose: (reason: PopoverCloseReason) => void;
  children: React.ReactNode;
}

/**
 * A panel that hangs below its anchor, or above it when there isn't room for it below and there is
 * more above. It follows the anchor whenever it renders and as the page scrolls or resizes, and
 * asks to close on a press outside both itself and the anchor, or on Escape, which `useEscapeKey`
 * marks handled so that Portal's popup stays open. Which way it opens is decided from the height
 * it had when it opened, and decided again only when the page scrolls or resizes, so neither its
 * content nor its anchor changing size while it is open flips it.
 */
export default function Popover({
  anchor,
  align,
  fit = false,
  onClose,
  className,
  children,
  ...attributes
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openedHeight = useRef<number | null>(null);
  const opensUp = useRef<boolean | null>(null);

  // Written to the panel's style directly rather than kept in state, so the panel has its width
  // before its height is measured, and is in place before the component that opened it moves focus
  // inside it in a layout effect of its own.
  const place = useCallback(
    (redecide: boolean) => {
      const field = anchor.current;
      const panel = panelRef.current;
      if (!field || !panel) {
        return;
      }
      const rect = field.getBoundingClientRect();
      // The panel is positioned inside its host, so it is placed in the host's coordinates.
      const host = getPopoverHost(field).getBoundingClientRect();
      const { style } = panel;
      if (align === 'end') {
        style.right = px(host.right - rect.right);
      } else {
        style.left = px(rect.left - host.left);
        style.width = px(rect.width);
      }
      openedHeight.current ??= panel.offsetHeight;
      const visible = getVisibleBox(field);
      const roomBelow = visible ? visible.bottom - rect.bottom - GAP - EDGE_MARGIN : Infinity;
      const roomAbove = visible ? rect.top - visible.top - GAP - EDGE_MARGIN : 0;
      if (redecide || opensUp.current === null) {
        opensUp.current = roomBelow < openedHeight.current && roomAbove > roomBelow;
      }
      const up = opensUp.current;
      style.top = px(up ? rect.top - host.top - GAP : rect.bottom - host.top + GAP);
      // Pulled up by its own height rather than placed from it, so a panel above the anchor keeps
      // its bottom edge there whatever height it grows or shrinks to.
      style.transform = up ? 'translateY(-100%)' : '';
      const room = up ? roomAbove : roomBelow;
      if (fit && Number.isFinite(room)) {
        style.maxHeight = px(Math.max(0, room));
      }
    },
    [anchor, align, fit],
  );

  // After every render and before the browser paints, so the panel never shows in the wrong place,
  // and follows an anchor that changed size with the render, such as a field given another row of
  // chips.
  useLayoutEffect(() => {
    place(false);
  });

  // Called through a ref, so a caller that passes a new `onClose` on every render, as an inline
  // function does, doesn't subscribe these listeners again on every render.
  const latestOnClose = useLatest(onClose);

  useEffect(() => {
    const field = anchor.current;
    const doc = field?.ownerDocument;
    const view = doc?.defaultView;
    if (!field || !doc || !view) {
      return undefined;
    }
    // Portal draws in an iframe, so an event's target is a node of the iframe's own window, which
    // the page's Node doesn't recognise.
    const isInsidePanel = (target: EventTarget | null) =>
      target instanceof view.Node && Boolean(panelRef.current?.contains(target));
    const closeOnPressOutside = (event: PointerEvent) => {
      if (
        event.target instanceof view.Node &&
        !field.contains(event.target) &&
        !isInsidePanel(event.target)
      ) {
        latestOnClose.current('outside');
      }
    };
    // Captured, because what scrolls is Portal's popup rather than the document. Scrolling inside
    // the panel doesn't move the anchor.
    const placeOnScroll = (event: Event) => {
      if (!isInsidePanel(event.target)) {
        place(true);
      }
    };
    const placeOnResize = () => place(true);
    doc.addEventListener('pointerdown', closeOnPressOutside);
    doc.addEventListener('scroll', placeOnScroll, true);
    view.addEventListener('resize', placeOnResize);
    return () => {
      doc.removeEventListener('pointerdown', closeOnPressOutside);
      doc.removeEventListener('scroll', placeOnScroll, true);
      view.removeEventListener('resize', placeOnResize);
    };
  }, [anchor, latestOnClose, place]);

  useEscapeKey(anchor, () => onClose('escape'));

  const field = anchor.current;
  if (!field) {
    return null;
  }
  return createPortal(
    <div
      ref={panelRef}
      className={['gh-portal-popover', fit && 'is-fitted', className].filter(Boolean).join(' ')}
      {...attributes}
    >
      {children}
    </div>,
    getPopoverHost(field),
  );
}
