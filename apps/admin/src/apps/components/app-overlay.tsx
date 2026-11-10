import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hideOthers } from 'aria-hidden';
import {
  OVERLAY_FRAME_NAME,
  type OverlayOptions,
  type OverlayTint,
} from '@tryghost/app-contracts/bridge';
import { ShadeScope } from '@tryghost/shade/app';
import { cn } from '@tryghost/shade/utils';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX } from '@/apps/lib/frame';
import { type OverlayStrip, overlayStrip } from '@/apps/lib/overlay-strip';

// Shade's own overlays: a dialog's, and a sheet's, which is lighter.
const TINT_CLASSES: Record<OverlayTint, string> = {
  dialog: 'bg-black/30 dark:bg-black/60',
  sheet: 'bg-black/10',
};

const clipPath = ({ top, right, bottom, left }: OverlayStrip) =>
  `inset(${top}px ${right}px ${bottom}px ${left}px)`;

/** The window's size, followed while `active`. */
function useWindowSize(active: boolean) {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useLayoutEffect(() => {
    if (!active) {
      return undefined;
    }
    const resize = () =>
      setSize((current) => {
        const next = read();
        return current.width === next.width && current.height === next.height ? current : next;
      });
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active]);
  return size;
}

/**
 * The app's overlay frame and Admin's tint, which let the app's dialogs and sheets cover all of
 * Admin. Both sit above Admin's chrome and cover the whole window: the frame does so that the
 * app's dialogs and sheets lay out against the window, exactly where Admin's own sit, with
 * Shade's breakpoints and sizes measured against it too. Admin clips the frame to the strip
 * the dialog or sheet on top fills (see `overlayStrip`), so whatever the app draws outside that
 * strip never shows, and a press outside it lands on the tint, which is Admin's. A dialog or
 * sheet wide enough overlaps Admin's tinted sidebar, as Admin's own do.
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
  /** The app's page frame, where Admin's top bar ends, and where focus goes as the overlay hides. */
  pageFrame: HTMLIFrameElement | null;
  src: string;
  title: string;
  /** The tint and width while the page has a dialog or sheet open in the overlay. */
  overlay: OverlayOptions | undefined;
  colorScheme: 'light' | 'dark';
  onDismiss: () => void;
  /** The overlay frame holds a document on Admin's own origin. */
  onLeft: () => void;
}> = ({ pageFrame, src, title, overlay, colorScheme, onDismiss, onLeft }) => {
  // Fixed for the frame's life: a new one, as a single-page app moves, would reload it. A page
  // that loads another document remounts the overlay with that one's address.
  const [source] = useState(src);
  const shown = overlay !== undefined;
  // The tint fades out in the colour it faded in with, and the strip stays where it was, so the
  // dialog's own closing animation shows.
  const [last, setLast] = useState<OverlayOptions>();
  if (overlay && (overlay.tint !== last?.tint || overlay.width !== last.width)) {
    setLast(overlay);
  }
  const windowSize = useWindowSize(shown);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    if (shown && pageFrame) {
      setTop(Math.max(0, Math.round(pageFrame.getBoundingClientRect().top)));
    }
  }, [shown, pageFrame, windowSize]);
  const strip = last && overlayStrip(last, windowSize, top);

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
          TINT_CLASSES[last?.tint ?? 'dialog'],
          shown ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        data-testid="app-overlay-tint"
        aria-hidden
        onClick={onDismiss}
        // Focus stays in the overlay: a dialog that stays open when pressed outside, such as an
        // alert dialog, keeps it.
        onMouseDown={(event) => event.preventDefault()}
      />
      <iframe
        ref={frame}
        allow={APP_FRAME_ALLOW}
        aria-hidden={!shown}
        // Hidden only once the tint has faded, so a dialog's own closing animation shows.
        className={cn(
          'fixed inset-0 z-50 block size-full border-0 transition-[visibility] duration-0',
          shown ? 'visible delay-0' : 'invisible delay-200',
        )}
        data-testid="app-overlay-frame"
        name={OVERLAY_FRAME_NAME}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={APP_FRAME_SANDBOX}
        src={source}
        // Nothing shows before the page has said what's open.
        style={{ clipPath: strip ? clipPath(strip) : 'inset(50%)', colorScheme }}
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
    </ShadeScope>,
    document.body,
  );
};
