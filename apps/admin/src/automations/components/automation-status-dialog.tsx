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
import { Stack } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';

// The "Label added to a member" trigger's label, for the publish confirmation (NY-1750).
// `memberCount` is null while it loads or when it can't be read.
export type PublishLabelTrigger = {
  name: string;
  memberCount: number | null;
};

interface AutomationStatusDialogProps {
  status: AutomationStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  isError: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  labelTrigger?: PublishLabelTrigger;
}

const AutomationStatusDialog = ({
  status,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  isError,
  onCloseAutoFocus,
  labelTrigger,
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
          {status === 'active' && labelTrigger ? (
            <LabelTriggerDescription labelTrigger={labelTrigger} />
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

// Names the trigger's label, and says members who already have it won't start (NY-1750).
const LabelTriggerDescription = ({ labelTrigger }: { labelTrigger: PublishLabelTrigger }) => {
  const { name, memberCount } = labelTrigger;
  const goesLive = (
    <>
      Once published, your automation goes live. Members who get the <strong>{name}</strong> label
      from now on will be enrolled automatically.
    </>
  );
  if (!memberCount) {
    return <AlertDialogDescription>{goesLive}</AlertDialogDescription>;
  }
  return (
    <AlertDialogDescription asChild>
      <Stack gap="lg">
        <p>{goesLive}</p>
        <p>
          The <strong>{formatNumber(memberCount)}</strong>{' '}
          {memberCount === 1 ? 'member' : 'members'} already labeled <strong>{name}</strong> will
          not be enrolled.
        </p>
      </Stack>
    </AlertDialogDescription>
  );
};

export default AutomationStatusDialog;
