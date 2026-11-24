import { CodeConfirmDialog } from './code-confirm-dialog';

/** E2: new backup codes need a current code first. */
export function RegenerateDialog({
  open,
  onCancel,
  onConfirmed,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  return (
    <CodeConfirmDialog
      confirmLabel="Get new codes"
      description="Your old backup codes stop working as soon as you get new ones."
      open={open}
      title="Get new backup codes?"
      onCancel={onCancel}
      onConfirmed={onConfirmed}
    />
  );
}
