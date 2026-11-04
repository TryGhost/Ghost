import { useId, useState } from 'react';
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
  Field,
  FieldError,
  FieldLabel,
  LoadingIndicator,
  RadioGroup,
  RadioGroupItem,
} from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';

// The "Label added to a member" trigger's label, for the publish confirmation (NY-1750).
// `memberCount` is null while it loads or when it can't be read.
export type PublishLabelTrigger = {
  name: string;
  memberCount: number | null;
};

// Not saved yet: the API can't enroll members who already have the label (NY-1750).
type Enrollment = 'new' | 'new_and_existing';

// Finishes "from now on, plus …"; a count that can't be read still asks.
const existingMembers = (count: number | null): string => {
  if (count === null) {
    return 'those who already have it';
  }
  return count === 1
    ? 'the 1 who already has it'
    : `the ${formatNumber(count)} who already have it`;
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
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        {/* Inside the content, so a choice made here is forgotten when the dialog closes. */}
        <AutomationStatusDialogBody
          isError={isError}
          isPending={isPending}
          labelTrigger={status === 'active' ? labelTrigger : undefined}
          status={status}
          onConfirm={onConfirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
};

const AutomationStatusDialogBody = ({
  status,
  onConfirm,
  isPending,
  isError,
  labelTrigger,
}: Pick<
  AutomationStatusDialogProps,
  'status' | 'onConfirm' | 'isPending' | 'isError' | 'labelTrigger'
>) => {
  const id = useId();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [showEnrollmentError, setShowEnrollmentError] = useState(false);
  // Only asked when members already have the label; with none, there is nothing to choose.
  const asksEnrollment = labelTrigger !== undefined && labelTrigger.memberCount !== 0;
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
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>
          {labelTrigger ? (
            <>
              Once published, this automation will enroll any member who gets a {labelTrigger.name}{' '}
              label{asksEnrollment ? ':' : '.'}
            </>
          ) : (
            description
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {asksEnrollment && (
        <Field data-invalid={showEnrollmentError || undefined}>
          <RadioGroup
            aria-describedby={showEnrollmentError ? `${id}-error` : undefined}
            aria-invalid={showEnrollmentError || undefined}
            aria-label="Who to enroll"
            value={enrollment ?? ''}
            onValueChange={(value) => {
              setEnrollment(value as Enrollment);
              setShowEnrollmentError(false);
            }}
          >
            <Field orientation="horizontal">
              <RadioGroupItem id={`${id}-new`} value="new" />
              <FieldLabel className="font-normal" htmlFor={`${id}-new`}>
                from now on
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem id={`${id}-existing`} value="new_and_existing" />
              <FieldLabel className="font-normal" htmlFor={`${id}-existing`}>
                from now on, plus {existingMembers(labelTrigger?.memberCount ?? null)}
              </FieldLabel>
            </Field>
          </RadioGroup>
          {showEnrollmentError && <FieldError id={`${id}-error`}>Choose who to enroll.</FieldError>}
        </Field>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <Button
          disabled={isPending}
          variant={isError ? 'destructive' : 'default'}
          onClick={() => {
            if (asksEnrollment && enrollment === null) {
              setShowEnrollmentError(true);
              return;
            }
            onConfirm();
          }}
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
    </>
  );
};

export default AutomationStatusDialog;
