import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@tryghost/shade/utils';

// Spread onto controls that act on the canvas around a card, like the add-step button and
// its menu: pressing them isn't leaving the open card. The card that opens as a result
// collapses the others instead (see CARD_OPENED).
export const KEEPS_CARDS_OPEN = { 'data-keeps-cards-open': '' } as const;

const CARD_OPENED = 'automation-card-opened';

// Expanded while it's being worked on. A press inside opens the card; a press or focus
// anywhere else closes it. "Inside" is the React tree, not the DOM, so the card's own
// portalled lists (Select, the tier pickers) count as inside, the way Radix decides
// outside presses for its own layers.
//
// `held` keeps the card expanded, for one that still needs fixing. Letting go leaves it
// expanded until the next press elsewhere, so finishing a choice never collapses the
// card under the pointer.
const useCardExpansion = (held: boolean, startExpanded: boolean) => {
  const [open, setOpen] = useState(held || startExpanded);
  if (held && !open) {
    setOpen(true);
  }
  const insideRef = useRef(false);
  const self = useRef({});

  // A card that arrives open, like a step just added, takes over from the one that was.
  useEffect(() => {
    if (startExpanded) {
      document.dispatchEvent(new CustomEvent(CARD_OPENED, { detail: self.current }));
    }
    // Mount only: startExpanded is read once, like the initial state.
  }, []);

  useEffect(() => {
    if (!open || held) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Captured on the document because React Flow consumes canvas pointer events. The
    // card's own capture handlers run after this one, so wait for them before deciding.
    const checkOutside = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-keeps-cards-open]')) {
        return;
      }
      insideRef.current = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!insideRef.current) {
          setOpen(false);
        }
      });
    };
    const collapseForOther = (event: Event) => {
      if ((event as CustomEvent).detail !== self.current) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', checkOutside, true);
    document.addEventListener('focusin', checkOutside, true);
    document.addEventListener(CARD_OPENED, collapseForOther);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', checkOutside, true);
      document.removeEventListener('focusin', checkOutside, true);
      document.removeEventListener(CARD_OPENED, collapseForOther);
    };
  }, [open, held]);

  return {
    expanded: open || held,
    setExpanded: setOpen,
    markInside: () => {
      insideRef.current = true;
    },
  };
};

// Collapsed, a card is its header with one statement in place of its title. Pressing the
// card, or Enter on the statement, opens it; Escape, or a press or focus elsewhere,
// collapses it again. A card with something missing or invalid stays open, so what needs
// fixing is never hidden.
export const useCollapsibleCard = ({
  held,
  startExpanded = false,
  onInteract,
}: {
  held: boolean;
  startExpanded?: boolean;
  onInteract?: () => void;
}) => {
  const { expanded, setExpanded, markInside } = useCardExpansion(held, startExpanded);
  const collapsed = !expanded;

  // Opening and closing swap the header's title, so focus moves with them.
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLButtonElement>(null);
  const focusAfterToggle = useRef<'card' | 'title' | null>(null);
  useEffect(() => {
    const target = focusAfterToggle.current === 'title' ? titleRef : cardRef;
    if (focusAfterToggle.current) {
      target.current?.focus({ preventScroll: true });
    }
    focusAfterToggle.current = null;
  }, [expanded]);

  const open = () => {
    focusAfterToggle.current = 'card';
    setExpanded(true);
  };
  const interact = () => {
    markInside();
    onInteract?.();
  };

  return {
    collapsed,
    // Spread onto the AutomationCard.
    cardProps: {
      ref: cardRef,
      tabIndex: -1,
      className: cn(
        'transition-colors outline-none',
        collapsed && 'cursor-pointer hover:border-border-strong',
      ),
      onFocusCapture: interact,
      onPointerDownCapture: (event: React.PointerEvent) => {
        interact();
        if (collapsed) {
          // The pressed statement leaves the header as the card opens, and the browser
          // would hand focus to the canvas instead, which reads as leaving the card.
          event.preventDefault();
          open();
        }
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        // Open lists claim their own Escape first.
        if (event.key === 'Escape' && !event.defaultPrevented && !collapsed && !held) {
          focusAfterToggle.current = 'title';
          setExpanded(false);
        }
      },
    },
    // The header title: the statement, as a button, while collapsed; the card's name while open.
    title: (name: string, statement: string) =>
      collapsed ? (
        <button
          ref={titleRef}
          aria-expanded={false}
          className="cursor-pointer rounded-sm text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-focus-ring"
          type="button"
          onClick={open}
        >
          {statement}
        </button>
      ) : (
        name
      ),
  };
};
