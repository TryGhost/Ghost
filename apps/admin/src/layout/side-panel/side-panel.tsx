import React from 'react';
import { cn } from '@tryghost/shade/utils';
import { type SidePanelSize, sidePanelStore } from './side-panel-store';
import { useSidePanel } from './use-side-panel';

const PANEL_WIDTH: Record<SidePanelSize, string> = {
  default: 'w-[380px]',
  full: 'w-[calc(100%-var(--side-panel-navigation-width))]',
};

// Less the bezel between the panel and the page's card
const FRAMED_PANEL_WIDTH: Record<SidePanelSize, string> = {
  default: 'w-[380px]',
  full: 'w-[calc(100%-var(--side-panel-navigation-width)-var(--admin-frame-side))]',
};

interface SidePanelProps {
  /** False hides open content without closing it. */
  visible: boolean;
  framed: boolean;
  /** Makes the panel inert, as the navigation and page are while the unpaid-subscription takeover shows. */
  locked: boolean;
}

export function SidePanel({ visible, framed, locked }: SidePanelProps) {
  const { state, close } = useSidePanel();
  const shown = visible && state.open;
  const regionRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    sidePanelStore.setAvailable(visible);
  }, [visible]);

  // The layout can swap this panel for a new one, e.g. when the Admin 7 frame
  // appears once the Labs config loads. This cleanup has to run before the new
  // panel marks itself available, or the panel stays unavailable. Layout effect
  // cleanups run before new layout effects, but a useEffect cleanup runs after.
  React.useLayoutEffect(
    () => () => {
      sidePanelStore.setAvailable(false);
      sidePanelStore.reset();
    },
    [],
  );

  // The content is a node from outside React. Moving a node in the DOM can reset
  // it (an iframe reloads, for one), so it's only inserted when it changes.
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    if (!state.element) {
      content.replaceChildren();
    } else if (content.firstChild !== state.element) {
      content.replaceChildren(state.element);
    }
  }, [state.element]);

  // The content takes focus itself if it wants it. Closing returns focus to
  // where it was before opening, as the content it was in is hidden.
  const returnFocusRef = React.useRef<Element | null>(null);
  React.useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region || !state.element) {
      return;
    }
    if (state.open) {
      if (!region.contains(document.activeElement)) {
        returnFocusRef.current = document.activeElement;
      }
      return;
    }
    const returnFocus = returnFocusRef.current;
    returnFocusRef.current = null;
    const focusWasWithin =
      region.contains(document.activeElement) || document.activeElement === document.body;
    if (focusWasWithin && returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
  }, [state.open, state.element]);

  React.useEffect(() => {
    if (!shown || locked) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      // Radix marks the Escape that dismissed a dialog or menu
      if (event.key === 'Escape' && !event.defaultPrevented) {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shown, locked, close]);

  // Applied through a ref because React 18 has no first-class inert prop.
  React.useLayoutEffect(() => {
    if (regionRef.current) {
      regionRef.current.inert = locked;
    }
  }, [locked]);

  return (
    // No role or name: the content brings its own semantics
    <div
      ref={regionRef}
      className={cn(
        'flex h-full shrink-0 justify-end overflow-hidden bg-background duration-200 ease-out motion-reduce:transition-none',
        // Visible as soon as it opens, so it can take focus, and hidden once it has closed
        shown
          ? cn(
              'transition-[width,margin]',
              framed
                ? cn(
                    'ml-(--admin-frame-side) rounded-(--admin-frame-radius) dark:ring-1 dark:ring-border-glass',
                    FRAMED_PANEL_WIDTH[state.size],
                  )
                : cn('border-l border-border', PANEL_WIDTH[state.size]),
            )
          : 'invisible w-0 transition-[width,margin,visibility]',
      )}
      data-side-panel={shown ? state.size : 'closed'}
    >
      {/* At its full width while the panel animates, so the content doesn't reflow, and against
          the right edge, where it ends up as the panel opens, closes or collapses */}
      <div
        ref={contentRef}
        className={cn(
          'h-full shrink-0 *:size-full',
          state.size === 'full' ? 'w-full' : 'w-[380px]',
        )}
      />
    </div>
  );
}
