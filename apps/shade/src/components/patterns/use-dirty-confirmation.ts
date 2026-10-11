import * as React from 'react';

import type { DirtyConfirmDialogController } from '@/components/patterns/dirty-confirm-dialog';

export function useDirtyConfirmation(): DirtyConfirmDialogController {
  const pendingAction = React.useRef<(() => void) | null>(null);
  const [open, setOpen] = React.useState(false);

  const confirm = React.useCallback((dirty: boolean, action: () => void) => {
    if (!dirty) {
      action();
      return;
    }

    pendingAction.current = action;
    setOpen(true);
  }, []);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      pendingAction.current = null;
    }
  }, []);

  const handleConfirm = React.useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setOpen(false);
    action?.();
  }, []);

  return {
    confirm,
    dialogProps: {
      open,
      onConfirm: handleConfirm,
      onOpenChange: handleOpenChange,
    },
  };
}
