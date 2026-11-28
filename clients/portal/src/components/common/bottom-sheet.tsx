import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CrossIcon from '../../images/icons/cross.svg?react';
import { t } from '../../utils/i18n';
import { useEscapeKey } from './popover';

/** How long the sheet takes to slide away once it is let go past the point that closes it. */
const SLIDE_AWAY_MS = 200;

/** A drag faster than this, in pixels per millisecond, closes the sheet however short it is. */
const FLICK_SPEED = 0.5;

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const BottomSheetStyles = `
    .gh-portal-sheet-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.3);
        touch-action: none;
        animation: gh-portal-sheet-fade 0.2s ease-out;
    }

    .gh-portal-sheet {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        max-height: 70vh;
        max-height: 70dvh;
        padding-bottom: env(safe-area-inset-bottom);
        border-radius: 16px 16px 0 0;
        background: var(--white);
        box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
        transition: transform 0.2s ease-out;
        animation: gh-portal-sheet-rise 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    /* The header is what drags, so whatever scrolls below it keeps its own touch scrolling. */
    .gh-portal-sheet-header {
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 12px 4px 22px;
        touch-action: none;
        user-select: none;
    }

    /* The drag handle. */
    .gh-portal-sheet-header::before {
        content: "";
        position: absolute;
        top: 8px;
        left: 50%;
        width: 36px;
        height: 4px;
        margin-left: -18px;
        border-radius: 2px;
        background: var(--grey10);
    }

    .gh-portal-sheet-title {
        color: var(--grey0);
        font-size: 1.6rem;
        font-weight: 600;
    }

    .gh-portal-sheet-close {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--grey13);
        color: var(--grey5);
        cursor: pointer;
    }

    @keyframes gh-portal-sheet-fade {
        from { opacity: 0; }
    }

    @keyframes gh-portal-sheet-rise {
        from { transform: translateY(100%); }
    }

    @media (prefers-reduced-motion: reduce) {
        .gh-portal-sheet-backdrop,
        .gh-portal-sheet {
            transition: none;
            animation: none;
        }
    }
`;

interface BottomSheetProps {
  /** An element of the document the sheet opens over, such as the control that opened it. */
  opener: React.RefObject<HTMLElement>;
  /** The sheet's title, which also names it for assistive tech. */
  title: string;
  /** Asks for the sheet to close: from its close button, its backdrop, Escape or a drag down. */
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A panel that rises from the bottom of the screen over a backdrop, for a phone. Its header holds
 * the title, a drag handle and a close button, and dragging the header down past a quarter of the
 * sheet's height, or flicking it down, slides the sheet away and closes it; a drag the browser
 * cancels puts the sheet back. A tap on the backdrop, the close button or Escape closes it too.
 * Tab and Shift+Tab move focus round what the sheet holds without leaving it; whoever opens the
 * sheet moves focus into it.
 */
export default function BottomSheet({ opener, title, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ from: number; at: number; by: number } | null>(null);
  const slideAway = useRef<number | null>(null);

  useEscapeKey(sheetRef, onClose);

  useEffect(() => {
    const sheet = sheetRef.current;
    const doc = sheet?.ownerDocument;
    if (!sheet || !doc) {
      return undefined;
    }
    // On the document rather than the sheet, so Tab stays in the sheet even after a press on
    // something in it that can't take focus, which leaves focus on the body.
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }
      event.preventDefault();
      const tabbable = Array.from(sheet.querySelectorAll<HTMLElement>(TABBABLE));
      const at = tabbable.findIndex((element) => element === doc.activeElement);
      const step = event.shiftKey ? -1 : 1;
      const next = at === -1 && event.shiftKey ? tabbable.length - 1 : at + step;
      tabbable[(next + tabbable.length) % tabbable.length]?.focus();
    };
    doc.addEventListener('keydown', keepFocusInside);
    return () => doc.removeEventListener('keydown', keepFocusInside);
  }, []);

  useEffect(
    () => () => {
      if (slideAway.current !== null) {
        window.clearTimeout(slideAway.current);
      }
    },
    [],
  );

  const dragHeader = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      drag.current = { from: event.clientY, at: event.timeStamp, by: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
      const style = sheetRef.current?.style;
      // While the rise animation runs, its transform overrides the one the drag sets, so a drag
      // started then wouldn't move the sheet. Stopped for good rather than restored after the
      // drag, since setting the animation back would play the rise again.
      style?.setProperty('animation', 'none');
      style?.setProperty('transition', 'none');
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current || !sheetRef.current) {
        return;
      }
      drag.current.by = Math.max(0, event.clientY - drag.current.from);
      sheetRef.current.style.transform = `translateY(${drag.current.by}px)`;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      const sheet = sheetRef.current;
      const released = drag.current;
      drag.current = null;
      if (!released || !sheet) {
        return;
      }
      sheet.style.removeProperty('transition');
      const flicked = released.by / Math.max(1, event.timeStamp - released.at) > FLICK_SPEED;
      if (released.by > sheet.offsetHeight / 4 || flicked) {
        sheet.style.transform = 'translateY(100%)';
        slideAway.current = window.setTimeout(onClose, SLIDE_AWAY_MS);
      } else {
        sheet.style.transform = '';
      }
    },
    // A pointer is cancelled when the browser or the system takes its gesture over, which the
    // member didn't mean as letting go, so a cancelled drag puts the sheet back however far it
    // went rather than closing it.
    onPointerCancel: () => {
      drag.current = null;
      const sheet = sheetRef.current;
      if (!sheet) {
        return;
      }
      sheet.style.removeProperty('transition');
      sheet.style.transform = '';
    },
  };

  const doc = opener.current?.ownerDocument;
  if (!doc) {
    return null;
  }
  // Drawn into the Portal frame's body rather than inside Portal's popup:
  // .gh-portal-popup-container has a transform, which makes it the containing block for
  // position: fixed, so a sheet inside it would be fixed to the popup rather than the screen.
  return createPortal(
    <>
      <div aria-hidden="true" className="gh-portal-sheet-backdrop" onClick={onClose} />
      <div
        ref={sheetRef}
        aria-label={title}
        aria-modal="true"
        className="gh-portal-sheet"
        role="dialog"
      >
        <div
          className="gh-portal-sheet-header"
          onPointerCancel={dragHeader.onPointerCancel}
          onPointerDown={dragHeader.onPointerDown}
          onPointerMove={dragHeader.onPointerMove}
          onPointerUp={dragHeader.onPointerUp}
        >
          <span aria-hidden="true" className="gh-portal-sheet-title">
            {title}
          </span>
          <button
            aria-label={t('Close')}
            className="gh-portal-sheet-close"
            type="button"
            onClick={onClose}
            // Taps on the close button close the sheet rather than starting a drag of it.
            onPointerDown={(event) => event.stopPropagation()}
          >
            <CrossIcon aria-hidden="true" height={16} width={16} />
          </button>
        </div>
        {children}
      </div>
    </>,
    doc.body,
  );
}
