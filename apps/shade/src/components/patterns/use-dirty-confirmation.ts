import * as React from 'react';

import type { DirtyConfirmDialogController } from '@/components/patterns/dirty-confirm-dialog';

export function useDirtyConfirmation(): DirtyConfirmDialogController {
  const pendingAction = React.useRef<(() => void) | null>(null);
  const [open, setOpenState] = React.useState(false);
  // Read by confirm, which handlers call outside render and keep without re-subscribing.
  const openRef = React.useRef(false);

  const setOpen = React.useCallback((nextOpen: boolean) => {
    openRef.current = nextOpen;
    setOpenState(nextOpen);
  }, []);

  const confirm = React.useCallback(
    (dirty: boolean, action: () => void) => {
      // The confirmation is modal, so only a dismissal can ask again while it is open, and that
      // dismissal was meant for it. Radix hands Escape to a newly opened layer a scheduler task
      // after it appears, so an Escape pressed straight away reaches the surface underneath, which
      // asks again.
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
