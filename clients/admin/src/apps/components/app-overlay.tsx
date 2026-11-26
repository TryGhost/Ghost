import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hideOthers } from 'aria-hidden';
import { dequal } from 'dequal';
import {
  OVERLAY_FRAME_NAME,
  type OverlayTint,
  type SafeArea,
} from '@tryghost/app-contracts/bridge';
import { overlayTint, ShadeScope } from '@tryghost/shade/app';
import { cn } from '@tryghost/shade/utils';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX } from '@/apps/lib/frame';
import {
  type Card,
  cardCorners,
  cardElement,
  measureCard,
  overlayClipPath,
} from '@/apps/lib/overlay-geometry';

/**
 * Set on `<html>` while an app's overlay shows, so Admin's chrome that floats over the app's page
 * hides from beneath it. Admin 7's unpinned navigation needn't: under the overlay it only closes.
 */
const APP_OVERLAY_ATTRIBUTE = 'data-app-overlay';

interface Surroundings {
  viewport: { width: number; height: number };
  card: Card | undefined;
}

/** The window and Admin's card, which the clip allows for. Kept as the overlay fades out. */
function useSurroundings(
  shown: boolean,
  everShown: boolean,
  pageFrame: HTMLIFrameElement | null,
): Surroundings {
  const [surroundings, setSurroundings] = useState<Surroundings>(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    card: undefined,
  }));
  useLayoutEffect(() => {
    if (!everShown) {
      return undefined;
    }
    const measure = () => {
      const { clientWidth, clientHeight } = document.documentElement;
      const next = {
        viewport: { width: clientWidth, height: clientHeight },
        card: pageFrame ? measureCard(pageFrame) : undefined,
      };
      setSurroundings((current) => (dequal(current, next) ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    const card = pageFrame && cardElement(pageFrame);
    if (card) {
      observer.observe(card);
    }
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // `shown` isn't read: the card may have moved, so it measures again each time it shows.
  }, [shown, everShown, pageFrame]);
  return surroundings;
}

/**
 * The app's overlay frame and Admin's tint, which let the app's dialogs and sheets cover Admin.
 * The frame covers the whole window, so dialogs lay out and meet Shade's breakpoints against the
 * window, and is clipped to the app's safe area, so presses beyond it land on the tint.
 */
export const AppOverlay: React.FC<{
  pageFrame: HTMLIFrameElement | null;
  /** Insets from the window's edges. */
  safeArea: SafeArea;
  src: string;
  title: string;
  /** Undefined while the overlay is hidden. */
  tint: OverlayTint | undefined;
  /** Matches the overlay document's: a frame whose scheme differs paints an opaque background. */
  colorScheme: 'light' | 'dark';
  onDismiss: () => void;
  /** The overlay frame holds a document on Admin's own origin. */
  onLeft: () => void;
}> = ({ pageFrame, safeArea, src, title, tint, colorScheme, onDismiss, onLeft }) => {
  // Fixed for the frame's life: a new address, as the app moves, would reload it.
  const [source] = useState(src);
  const shown = tint !== undefined;
  // Kept after the tint goes, so it fades out in the colour it faded in with.
  const [last, setLast] = useState<OverlayTint>();
  if (tint && tint !== last) {
    setLast(tint);
  }
  useLayoutEffect(() => {
    if (!shown) {
      return undefined;
    }
    document.documentElement.setAttribute(APP_OVERLAY_ATTRIBUTE, '');
    return () => document.documentElement.removeAttribute(APP_OVERLAY_ATTRIBUTE);
  }, [shown]);

  const { viewport, card } = useSurroundings(shown, last !== undefined, pageFrame);

  // Browsers don't reliably let one frame focus another, so the window holding both moves focus
  // between them.
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (shown) {
      frame.current?.focus({ preventScroll: true });
    } else if (frame.current && document.activeElement === frame.current) {
      pageFrame?.focus({ preventScroll: true });
    }
  }, [shown, pageFrame]);

  // So hovering the tint beside Admin 7's unpinned navigation doesn't open it under the overlay.
  const tintElement = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = tintElement.current;
    const stop = (event: PointerEvent) => event.stopPropagation();
    element?.addEventListener('pointermove', stop);
    element?.addEventListener('pointerover', stop);
    return () => {
      element?.removeEventListener('pointermove', stop);
      element?.removeEventListener('pointerover', stop);
    };
  }, []);

  // Inert, so focus can't land in the page, where the dialog's focus trap would see it. Set here,
  // sparing live regions: `aria-hidden`'s `inertOthers` shares counts with `hideOthers`, so undoing
  // one leaves the other's attribute behind.
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
        ref={tintElement}
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-200',
          overlayTint(last ?? 'dialog'),
          shown ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        data-testid="app-overlay-tint"
        aria-hidden
        onClick={onDismiss}
        // Keeps focus in a dialog that stays open when pressed outside, such as an alert dialog.
        onMouseDown={(event) => event.preventDefault()}
      />
      <iframe
        ref={frame}
        allow={APP_FRAME_ALLOW}
        aria-hidden={!shown}
        // Hidden once the tint has faded, so the dialog's closing animation shows.
        className={cn(
          'fixed inset-0 z-50 block size-full border-0 transition-[visibility] duration-0',
          shown ? 'visible delay-0' : 'pointer-events-none invisible delay-200',
        )}
        data-testid="app-overlay-frame"
        name={OVERLAY_FRAME_NAME}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={APP_FRAME_SANDBOX}
        src={source}
        style={{
          clipPath: overlayClipPath(safeArea, cardCorners(safeArea, viewport, card)),
          colorScheme,
        }}
        title={title}
        // Readable only on Admin's origin, where the frame's first document is blank.
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
