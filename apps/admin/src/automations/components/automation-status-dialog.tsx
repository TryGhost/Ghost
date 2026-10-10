import type { AutomationStatus } from '@tryghost/admin-x-framework/api/automations';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  LoadingIndicator,
} from '@tryghost/shade/components';

interface AutomationStatusDialogProps {
  status: AutomationStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  isError: boolean;
  onCloseAutoFocus?: (event: Event) => void;
}

const AutomationStatusDialog = ({
  status,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  isError,
  onCloseAutoFocus,
}: AutomationStatusDialogProps) => {
  const { title, description, buttonLabel, pendingLabel } = (() => {
    switch (status) {
      case 'active':
        return {
          title: 'Start your automation?',
          description:
            'Once published, your automation goes live. Any member who meets the trigger will be enrolled automatically.',
          buttonLabel: 'Publish',
          pendingLabel: 'Publishing...',
        };
      case 'inactive':
        return {
          title: 'Turn off automation?',
          description:
            'Your automation will no longer run, and any members currently in progress will be removed.',
          buttonLabel: 'Turn off',
          pendingLabel: 'Turning off...',
        };
      case 'archived':
        return {
          title: 'Archive automation?',
          description:
            'Your automation will no longer run, and any members currently in progress will be removed.',
          buttonLabel: 'Archive',
          pendingLabel: 'Archiving...',
        };
      default: {
        const _exhaustive: never = status;
        throw new Error(`Unknown automation status: ${String(_exhaustive)}`);
      }
    }
  })();

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            disabled={isPending}
            variant={isError ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <LoadingIndicator color="light" size="sm" />
                <span className="sr-only">{pendingLabel}</span>
              </>
            ) : isError ? (
              'Retry'
            ) : (
              buttonLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AutomationStatusDialog;
