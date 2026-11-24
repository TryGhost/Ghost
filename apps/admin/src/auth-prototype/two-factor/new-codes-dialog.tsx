import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@tryghost/shade/components';
import { BackupCodes } from './backup-codes';

/**
 * E2: a fresh set of backup codes after "Get new codes", in its own dialog on
 * top of the staff profile. It's an AlertDialog so it sits above the staff
 * profile's legacy modal layer, and clicking outside doesn't close it, so the
 * codes can't vanish before they're saved.
 */
export function NewCodesDialog({
  open,
  codes,
  siteTitle,
  onCancel,
  onFinish,
}: {
  open: boolean;
  codes: string[];
  siteTitle: string;
  onCancel: () => void;
  onFinish: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      {/* Escape closes only this dialog, not the staff profile behind it. */}
      <AlertDialogContent onEscapeKeyDown={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Your new backup codes</AlertDialogTitle>
        </AlertDialogHeader>
        <BackupCodes codes={codes} finishLabel="Done" siteTitle={siteTitle} onFinish={onFinish} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
