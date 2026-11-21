import type { AutomationStatus } from '@tryghost/admin-x-framework/api/automations';
import type { ReactNode } from 'react';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { escapeNqlString } from '@tryghost/nql-string';
import { formatNumber } from '@tryghost/shade/utils';
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
  triggerLabel?: { id: string; name?: string };
  status: AutomationStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  isError: boolean;
  onCloseAutoFocus?: (event: Event) => void;
}

const LabelPublishDescription = ({ id, name }: { id: string; name?: string }) => {
  const { count } = useMembersCount(`labels.id:${escapeNqlString(id)}`);
  const label = name ? (
    <>
      the <strong>{name}</strong> label
    </>
  ) : (
    'the selected label'
  );
  const existingLabel = name ? <strong>{name}</strong> : 'with the selected label';
  let existingMembers: ReactNode = null;
  if (count === null) {
    existingMembers = 'Members';
  } else if (count !== 0) {
    existingMembers = (
      <>
        The <strong>{formatNumber(count)}</strong> {count === 1 ? 'member' : 'members'}
      </>
    );
  }

  return (
    <AlertDialogDescription asChild>
      <div>
        <p>
          Once published, your automation goes live. Members who get {label} from now on will be
          enrolled automatically.
        </p>
        {existingMembers && (
          <p className="mt-3">
            {existingMembers} already labeled {existingLabel} will not be enrolled.
          </p>
        )}
      </div>
    </AlertDialogDescription>
  );
};

const AutomationStatusDialog = ({
  triggerLabel,
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
          {status === 'active' && triggerLabel ? (
            <LabelPublishDescription {...triggerLabel} />
          ) : (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
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
