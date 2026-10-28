import * as React from 'react';

import type { DirtyConfirmDialogController } from '@/components/patterns/dirty-confirm-dialog';

export function useDirtyConfirmation(): DirtyConfirmDialogController {
  const pendingAction = React.useRef<(() => void) | null>(null);
  const [open, setOpenState] = React.useState(false);
  // Mirrors `open` so that `confirm` can check whether the confirmation is showing. Reading the
  // state directly would put `open` in confirm's dependencies, giving callers a new function every
  // time the confirmation opens or closes. A ref also updates immediately, so two calls in the
  // same event both see the latest value.
  const openRef = React.useRef(false);

  const setOpen = React.useCallback((nextOpen: boolean) => {
    openRef.current = nextOpen;
    setOpenState(nextOpen);
  }, []);

  const confirm = React.useCallback(
    (dirty: boolean, action: () => void) => {
      // A call while the confirmation is already showing is treated as the user dismissing it:
      // close it and drop the pending action.
      //
      // This happens when the confirmation opens over another dialog that asks on Escape, such
      // as Admin's email design modal. Radix only routes Escape to a newly opened dialog once its
      // effects have run, a moment after it appears on screen. If the user presses Escape twice
      // quickly, the second press goes to the dialog underneath, and its Escape handler calls
      // `confirm` again. That call used to do nothing, so the second Escape was lost and the
      // confirmation stayed open.
      //
      // The confirmation is modal: clicks and focus can't reach anything behind it, so a second
      // call can only come from a dismissal like this one, and closing is what the user meant.
      // Radix bug: https://github.com/radix-ui/primitives/issues/4143
      if (openRef.current) {
        pendingAction.current = null;
        setOpen(false);
        return;
      }

      if (!dirty) {
        action();
        return;
      }

      pendingAction.current = action;
      setOpen(true);
    },
    [setOpen],
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        pendingAction.current = null;
      }
    },
    [setOpen],
  );

  const handleConfirm = React.useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setOpen(false);
    action?.();
  }, [setOpen]);

  return {
    confirm,
    dialogProps: {
      open,
      onConfirm: handleConfirm,
      onOpenChange: handleOpenChange,
    },
  };
}
