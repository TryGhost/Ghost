import { CodeConfirmDialog } from './code-confirm-dialog';

/** E3: turning two-step verification off. A backup code works here too. */
export function TurnOffDialog({
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
      confirmLabel="Turn off"
      description="You’ll sign in with just your password. Ghost still emails you a code when you sign in on a new device. Your backup codes stop working."
      open={open}
      title="Turn off two-step verification?"
      allowBackupCode
      destructive
      onCancel={onCancel}
      onConfirmed={onConfirmed}
    />
  );
}
