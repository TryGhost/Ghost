import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hideOthers } from 'aria-hidden';
import { OVERLAY_FRAME_NAME, type OverlayTint } from '@tryghost/app-contracts/bridge';
import { ShadeScope } from '@tryghost/shade/app';
import { cn } from '@tryghost/shade/utils';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX } from '@/apps/lib/frame';

// Shade's own overlays: a dialog's, and a sheet's, which is lighter.
const TINT_CLASSES: Record<OverlayTint, string> = {
  dialog: 'bg-black/30 dark:bg-black/60',
  sheet: 'bg-black/10',
};

interface Area {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Follows the box of `element`, the app's area, as the window or Admin's layout resizes it. The
 * box reaches over the padding to the right of the page, up to the content's edge, so a sheet
 * docks there. With the sidebar collapsed, Admin pads the page on both sides to keep it centred
 * beside the sidebar's button, but only the left padding has Admin's chrome in it.
 */
function useArea(element: HTMLElement | null, shown: boolean): Area | undefined {
  const [area, setArea] = useState<Area>();
  useLayoutEffect(() => {
    if (!element) {
      return undefined;
    }
    const page = element.closest('main');
    const measure = () => {
      const { top, left, height, width: own } = element.getBoundingClientRect();
      const width = own + (page ? parseFloat(getComputedStyle(page).paddingRight) || 0 : 0);
      setArea((current) =>
        current &&
        current.top === top &&
        current.left === left &&
        current.width === width &&
        current.height === height
          ? current
          : { top, left, width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // Measured again when the overlay shows: Admin's layout can move the area without
    // resizing it, such as when the sidebar pins.
  }, [element, shown]);
  return area;
}

/**
 * The app's overlay frame and Admin's tint, which let the app's dialogs and sheets cover all of
 * Admin. Both sit above Admin's chrome. The tint covers the whole window; the overlay frame
 * covers only the app's area, so whatever the app draws in it can't reach Admin's chrome, and a
 * press on the chrome always lands on the tint, which is Admin's.
 *
 * The overlay frame loads the app's page under `OVERLAY_FRAME_NAME`. The SDK in that document
 * keeps the app from starting there and gives the page frame, on the same origin, an empty,
 * transparent root to portal its dialogs into. The frame loads as soon as the page has started
 * and stays hidden, so opening a dialog doesn't wait for a load. It takes the page frame's
 * sandbox and permissions, and the page frame's check on what it loads: a document on Admin's
 * own origin loads the app's page again.
 *
 * `color-scheme` on the frame follows Admin's theme, as the SDK sets it on the overlay's
 * document: a frame whose scheme differs from its document's paints an opaque background.
 */
export const AppOverlay: React.FC<{
  /** The element whose box is the app's area, which the overlay frame covers. */
  area: HTMLElement | null;
  /** The app's page frame, which focus goes back to as the overlay hides. */
  pageFrame: HTMLIFrameElement | null;
  src: string;
  title: string;
  /** The tint while the page has a dialog or sheet open in the overlay, else undefined. */
  tint: OverlayTint | undefined;
  colorScheme: 'light' | 'dark';
  onDismiss: () => void;
  /** The overlay frame holds a document on Admin's own origin. */
  onLeft: () => void;
}> = ({ area: areaElement, pageFrame, src, title, tint, colorScheme, onDismiss, onLeft }) => {
  // Fixed for the frame's life: a new one, as a single-page app moves, would reload it. A page
  // that loads another document remounts the overlay with that one's address.
  const [source] = useState(src);
  const shown = tint !== undefined;
  const area = useArea(areaElement, shown);
  // The tint fades out in the colour it faded in with.
  const [lastTint, setLastTint] = useState<OverlayTint>(tint ?? 'dialog');
  if (tint && tint !== lastTint) {
    setLastTint(tint);
  }
  // Focus goes into the overlay as it shows, and back to the page frame as it hides, so the page
  // can put it back on what opened the dialog. The page frame moves focus to the dialog's first
  // control itself, but browsers don't reliably let one frame focus another: only the window
  // holding the frames can, and Admin has the publisher's click that opened the dialog. Focus
  // that has left the overlay frame, such as for Admin's own search, stays where it went.
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (shown) {
      frame.current?.focus({ preventScroll: true });
    } else if (frame.current && document.activeElement === frame.current) {
      pageFrame?.focus({ preventScroll: true });
    }
  }, [shown, pageFrame]);

  // While it shows, the overlay is modal: assistive technology leaves the rest of Admin, the
  // app's page included, as it does around Admin's own dialogs, which share the bookkeeping. The
  // rest is inert too, so focus can't land in the page, where the dialog's own focus trap, which
  // reads the page's document, would see it. That's lifted before focus goes back to the page.
  // `aria-hidden`'s own `inertOthers` counts with `hideOthers`, so undoing one leaves the other's
  // attribute behind; these are marked here instead, leaving live regions, such as toasts, alone.
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shown || !layer.current) {
      return undefined;
    }
    const element = layer.current;
    const undoHidden = hideOthers(element);
    const others = [...document.body.children].filter(
      (other): other is HTMLElement =>
        other instanceof HTMLElement &&
        other !== element &&
        !other.inert &&
        !other.matches('script, [aria-live]'),
    );
    for (const other of others) {
      other.inert = true;
    }
    return () => {
      for (const other of others) {
        other.inert = false;
      }
      undoHidden();
    };
  }, [shown]);

  return createPortal(
    <ShadeScope ref={layer} style={{ width: 'unset', height: 'unset' }}>
      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-200',
          TINT_CLASSES[lastTint],
          shown ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        data-testid="app-overlay-tint"
        aria-hidden
        onClick={onDismiss}
        // Focus stays in the overlay: a dialog that stays open when pressed outside, such as an
        // alert dialog, keeps it.
        onMouseDown={(event) => event.preventDefault()}
      />
      {area && (
        <iframe
          ref={frame}
          allow={APP_FRAME_ALLOW}
          aria-hidden={!shown}
          // Hidden only once the tint has faded, so a dialog's own closing animation shows.
          className={cn(
            'fixed z-50 block border-0 transition-[visibility] duration-0',
            shown ? 'visible delay-0' : 'invisible delay-200',
          )}
          data-testid="app-overlay-frame"
          name={OVERLAY_FRAME_NAME}
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={APP_FRAME_SANDBOX}
          src={source}
          style={{ ...area, colorScheme }}
          title={title}
          // Admin can read only a document on its own origin, never the app's. The frame's
          // first document, before the app's page loads, is Admin's own and blank.
          onLoad={(event) => {
            const loaded = event.currentTarget.contentDocument;
            if (loaded && loaded.URL !== 'about:blank') {
              onLeft();
            }
          }}
        />
      )}
    </ShadeScope>,
    document.body,
  );
};
