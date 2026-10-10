import { useEffect, useRef } from 'react';

export const useDismissOnOutsidePress = (open: boolean, setOpen: (open: boolean) => void) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dismissedOutside = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !contentRef.current?.contains(event.target)
      ) {
        dismissedOutside.current = true;
        setOpen(false);
      }
    };
    // React Flow consumes canvas pointer events before Radix can dismiss the popover.
    document.addEventListener('pointerdown', dismissOutside, true);
    return () => document.removeEventListener('pointerdown', dismissOutside, true);
  }, [open, setOpen]);

  const onCloseAutoFocus = (event: Event) => {
    if (dismissedOutside.current) {
      event.preventDefault();
    }
    dismissedOutside.current = false;
  };

  return { triggerRef, contentRef, onCloseAutoFocus };
};
