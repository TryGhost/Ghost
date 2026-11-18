import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hideOthers } from 'aria-hidden';
import {
  OVERLAY_FRAME_NAME,
  type OverlayTint,
  type SafeArea,
} from '@tryghost/app-contracts/bridge';
import { overlayTint, ShadeScope } from '@tryghost/shade/app';
import { cn } from '@tryghost/shade/utils';
import { APP_FRAME_ALLOW, APP_FRAME_SANDBOX } from '@/apps/lib/frame';
import { sameSafeArea } from '@/apps/lib/layout';
import {
  APP_OVERLAY_ATTRIBUTE,
  type Box,
  type Corners,
  clippingAncestors,
  overlayClipPath,
} from '@/apps/lib/overlay-clip';

interface Surroundings {
  window: { width: number; height: number };
  /** Admin's card, which clips the app's page, and how far its corners are rounded. */
  card: (Box & { radius: number }) | undefined;
}

const sameSurroundings = (a: Surroundings, b: Surroundings) =>
  a.window.width === b.window.width &&
  a.window.height === b.window.height &&
  (a.card === b.card ||
    (a.card !== undefined &&
      b.card !== undefined &&
      a.card.radius === b.card.radius &&
      sameSafeArea(a.card, b.card)));

const cornerRadius = (element: Element) =>
  parseFloat(getComputedStyle(element).borderTopRightRadius) || 0;

/** The nearest element around `element` that clips it with rounded corners: Admin's card. */
const roundedClipElement = (element: HTMLElement) =>
  clippingAncestors(element).find((clip) => cornerRadius(clip) > 0);

/** Admin's card, and how far its corners are rounded. */
function roundedClip(element: HTMLElement): (Box & { radius: number }) | undefined {
  const card = roundedClipElement(element);
  if (!card) {
    return undefined;
  }
  const { top, right, bottom, left } = card.getBoundingClientRect();
  return {
    top: Math.floor(top),
    right: Math.ceil(right),
    bottom: Math.ceil(bottom),
    left: Math.floor(left),
    radius: cornerRadius(card),
  };
}

/**
 * What the overlay's clip has to allow for besides the safe area, measured each time it shows and
 * while it does, then kept as it fades: the window, and Admin's card.
 */
function useSurroundings(
  shown: boolean,
  everShown: boolean,
  pageFrame: HTMLIFrameElement | null,
): Surroundings {
  const [surroundings, setSurroundings] = useState<Surroundings>(() => ({
    window: { width: window.innerWidth, height: window.innerHeight },
    card: undefined,
  }));
  useLayoutEffect(() => {
    if (!everShown) {
      return undefined;
    }
    const measure = () => {
      const { clientWidth, clientHeight } = document.documentElement;
      const next = {
        window: { width: clientWidth, height: clientHeight },
        card: pageFrame ? roundedClip(pageFrame) : undefined,
      };
      setSurroundings((current) => (sameSurroundings(current, next) ? current : next));
    };
    measure();
    // The card moves and resizes as Admin's frame opens and closes around it.
    const observer = new ResizeObserver(measure);
    const card = pageFrame && roundedClipElement(pageFrame);
    if (card) {
      observer.observe(card);
    }
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // Measured again each time it shows, as the card may have moved since.
  }, [shown, everShown, pageFrame]);
  return surroundings;
}

/** The corners of the safe area that are the card's own, which the clip rounds as the card does. */
function cardCorners(safeArea: SafeArea, { window: view, card }: Surroundings): Corners {
  if (!card) {
    return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
  }
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  const top = near(safeArea.top, card.top);
  const bottom = near(view.height - safeArea.bottom, card.bottom);
  const left = near(safeArea.left, card.left);
  const right = near(view.width - safeArea.right, card.right);
  return {
    topLeft: top && left ? card.radius : 0,
    topRight: top && right ? card.radius : 0,
    bottomRight: bottom && right ? card.radius : 0,
    bottomLeft: bottom && left ? card.radius : 0,
  };
}

/**
 * The app's overlay frame and Admin's tint, which let the app's dialogs and sheets cover all of
 * Admin. Both sit above Admin's chrome and cover the whole window: the frame does so that the
 * app's dialogs and sheets lay out against the window, as Admin's own do, with Shade's
 * breakpoints and sizes measured against it too. Admin clips the frame to the app's safe area,
 * the part of the window its page has to itself, so whatever the app draws over Admin's chrome
 * never shows, and a press there lands on the tint, which is Admin's. Admin's chrome that floats
 * over the page steps out of the way meanwhile (see `APP_OVERLAY_ATTRIBUTE`). The SDK gives the
 * overlay's document the same safe area, so Shade keeps dialogs and sheets inside it.
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
  /** The app's page frame, where focus goes as the overlay hides. */
  pageFrame: HTMLIFrameElement | null;
  /** The app's safe area, as insets from the window's edges: all of the frame that shows. */
  safeArea: SafeArea;
  src: string;
  title: string;
  /** The tint while the page has a dialog or sheet open in the overlay. */
  tint: OverlayTint | undefined;
  colorScheme: 'light' | 'dark';
  onDismiss: () => void;
  /** The overlay frame holds a document on Admin's own origin. */
  onLeft: () => void;
}> = ({ pageFrame, safeArea, src, title, tint, colorScheme, onDismiss, onLeft }) => {
  // Fixed for the frame's life: a new one, as a single-page app moves, would reload it. A page
  // that loads another document remounts the overlay with that one's address.
  const [source] = useState(src);
  const shown = tint !== undefined;
  // The tint fades out in the colour it faded in with, so the dialog's own closing animation
  // shows.
  const [last, setLast] = useState<OverlayTint>();
  if (tint && tint !== last) {
    setLast(tint);
  }
  // Admin's chrome that floats over the app's page, such as the side panel as a window, steps out
  // of the way while the overlay shows, as Admin's own dialogs cover it.
  useLayoutEffect(() => {
    if (!shown) {
      return undefined;
    }
    document.documentElement.setAttribute(APP_OVERLAY_ATTRIBUTE, '');
    return () => document.documentElement.removeAttribute(APP_OVERLAY_ATTRIBUTE);
  }, [shown]);

  const surroundings = useSurroundings(shown, last !== undefined, pageFrame);

  // Focus goes into the overlay as it shows, and back to the page frame as it hides, so the page
  // can put it back on what opened the dialog. The page frame moves focus to the dialog's first
  // control itself, but browsers don't reliably let one frame focus another: only the window
  // holding the frames can. Focus that has left the overlay frame, such as for Admin's own
  // search, stays where it went.
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (shown) {
      frame.current?.focus({ preventScroll: true });
    } else if (frame.current && document.activeElement === frame.current) {
      pageFrame?.focus({ preventScroll: true });
    }
  }, [shown, pageFrame]);

  // Admin's own pointer handlers don't see the pointer over the tint, so hovering beside Admin 7's
  // unpinned navigation doesn't open it under the overlay, where the app could draw over it.
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
        ref={tintElement}
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-200',
          // Shade's own tint, so it matches Admin's dialogs and sheets.
          overlayTint(last ?? 'dialog'),
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
          // It takes no presses from the moment it starts to hide.
          shown ? 'visible delay-0' : 'pointer-events-none invisible delay-200',
        )}
        data-testid="app-overlay-frame"
        name={OVERLAY_FRAME_NAME}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={APP_FRAME_SANDBOX}
        src={source}
        // Only the app's safe area shows: the rest of the window is Admin's.
        style={{
          clipPath: overlayClipPath(safeArea, cardCorners(safeArea, surroundings)),
          colorScheme,
        }}
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
