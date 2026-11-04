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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  LoadingIndicator,
  RadioGroup,
  RadioGroupItem,
} from '@tryghost/shade/components';
import { formatNumber, LucideIcon } from '@tryghost/shade/utils';

// The "Label added to a member" trigger's label, for the publish confirmation (NY-1750).
// `memberCount` is null while it loads or when it can't be read.
export type PublishLabelTrigger = {
  name: string;
  memberCount: number | null;
};

// Not saved yet: the API can't start members who already have the label (NY-1750).
type Enrollment = 'new' | 'new_and_existing';

// The label as the trigger card shows it: its tag icon says "label" for names that read like plain
// words ("Free trial"). The icon stays on the name's first word, so a line never ends on it alone.
const LabelName = ({ name }: { name: string }) => {
  const [firstWord, ...rest] = name.split(' ');
  return (
    <span className="font-medium text-foreground">
      <span className="whitespace-nowrap">
        <LucideIcon.Tag className="mr-1 inline size-3.5 align-[-2px]" />
        {firstWord}
      </span>
      {rest.length > 0 && ` ${rest.join(' ')}`}
    </span>
  );
};

// Who the second choice adds; a count that can't be read still offers it.
const existingMembersHint = (memberCount: number | null): string => {
  if (memberCount === null) {
    return 'Members who already have it will be added right away';
  }
  return memberCount === 1
    ? '1 member will be added right away'
    : `${formatNumber(memberCount)} members will be added right away`;
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
  // Asked only when members already have the label. No default: the publisher must say whether
  // those members start too (NY-1750).
  const asksEnrollment = labelTrigger !== undefined && labelTrigger.memberCount !== 0;
  const { title, description, buttonLabel, pendingLabel } = (() => {
    switch (status) {
      case 'active':
        return {
          title: labelTrigger ? 'Publish automation?' : 'Start your automation?',
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
              Start this automation for members who get <LabelName name={labelTrigger.name} />
              {asksEnrollment ? ':' : '.'}
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
            aria-label="Who to start this automation for"
            // Shade's 12px suits one-line radios; these carry a hint, so each needs a clearer break.
            className="gap-5"
            value={enrollment ?? ''}
            onValueChange={(value) => {
              setEnrollment(value as Enrollment);
              setShowEnrollmentError(false);
            }}
          >
            <Field orientation="horizontal">
              <RadioGroupItem id={`${id}-new`} value="new" />
              <FieldContent>
                <FieldLabel className="font-normal" htmlFor={`${id}-new`}>
                  From now on
                </FieldLabel>
                <FieldDescription>Only enroll members who get it after publishing</FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem id={`${id}-existing`} value="new_and_existing" />
              <FieldContent>
                <FieldLabel className="font-normal" htmlFor={`${id}-existing`}>
                  From now on and who already have it
                </FieldLabel>
                <FieldDescription>{existingMembersHint(labelTrigger.memberCount)}</FieldDescription>
              </FieldContent>
            </Field>
          </RadioGroup>
          {showEnrollmentError && (
            <FieldError id={`${id}-error`}>Choose who to start this automation for.</FieldError>
          )}
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
