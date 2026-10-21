import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  LoadingIndicator,
  Textarea,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useSendSupportRequest } from '@tryghost/admin-x-framework/api/support-requests';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import type { SupportRequestDraft } from './support-request';

// The support requests endpoint rejects anything longer
const SUBJECT_MAX = 255;
const MESSAGE_MAX = 10_000;

interface FormState {
  subject: string;
  message: string;
}

interface SupportRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: SupportRequestDraft;
  onSent?: () => void;
}

function initialFormState(draft: SupportRequestDraft): FormState {
  return {
    subject: draft.subject || '',
    message: draft.message || '',
  };
}

export function SupportRequestModal({
  open,
  onOpenChange,
  draft,
  onSent,
}: SupportRequestModalProps) {
  const handleError = useHandleError();
  const { data: currentUser } = useCurrentUser();
  const { mutateAsync: sendSupportRequest } = useSendSupportRequest();

  const { formState, updateForm, handleSave, saveState, errors, clearError } = useForm<FormState>({
    initialState: initialFormState(draft),
    onSave: async (state) => {
      await sendSupportRequest({
        subject: state.subject.trim(),
        message: state.message.trim(),
        source: draft.source,
        pageUrl: draft.pageUrl,
        context: draft.context ?? {},
      });
    },
    onSaveError: handleError,
    onValidate: (state) => {
      const newErrors: Record<string, string> = {};

      if (!state.subject.trim()) {
        newErrors.subject = 'Enter a subject';
      } else if (state.subject.trim().length > SUBJECT_MAX) {
        newErrors.subject = `Subject cannot be longer than ${SUBJECT_MAX} characters`;
      }

      if (!state.message.trim()) {
        newErrors.message = 'Enter a message';
      } else if (state.message.trim().length > MESSAGE_MAX) {
        newErrors.message = `Message cannot be longer than ${MESSAGE_MAX.toLocaleString('en-US')} characters`;
      }

      return newErrors;
    },
  });

  const isSubmitting = saveState === 'saving';

  const onSubmit = async () => {
    try {
      const success = await handleSave({ force: true });

      if (!success) {
        return;
      }
    } catch {
      return;
    }

    onOpenChange(false);

    onSent?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent data-testid="support-request-modal">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Review the details below and add any extra context before sending.
          </DialogDescription>
        </DialogHeader>
        <Stack gap="lg">
          <Field>
            <FieldLabel htmlFor="support-request-name">Name</FieldLabel>
            <Input id="support-request-name" value={currentUser?.name ?? ''} disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor="support-request-email">Email</FieldLabel>
            <Input
              id="support-request-email"
              type="email"
              value={currentUser?.email ?? ''}
              disabled
            />
          </Field>
          <Field data-invalid={Boolean(errors.subject) || undefined}>
            <FieldLabel htmlFor="support-request-subject">Subject</FieldLabel>
            <Input
              aria-invalid={Boolean(errors.subject) || undefined}
              disabled={isSubmitting}
              id="support-request-subject"
              value={formState.subject}
              onChange={(event) =>
                updateForm((state) => ({ ...state, subject: event.target.value }))
              }
              onKeyDown={() => clearError('subject')}
            />
            {errors.subject && <FieldError>{errors.subject}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(errors.message) || undefined}>
            <FieldLabel htmlFor="support-request-message">Message</FieldLabel>
            <Textarea
              aria-invalid={Boolean(errors.message) || undefined}
              disabled={isSubmitting}
              id="support-request-message"
              rows={6}
              value={formState.message}
              onChange={(event) =>
                updateForm((state) => ({ ...state, message: event.target.value }))
              }
              onKeyDown={() => clearError('message')}
            />
            {draft.context?.transcript && (
              <FieldDescription>Your conversation will be attached automatically.</FieldDescription>
            )}
            {errors.message && <FieldError>{errors.message}</FieldError>}
          </Field>
        </Stack>
        <DialogFooter>
          <Button
            disabled={isSubmitting}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="support-request-send"
            disabled={isSubmitting}
            type="button"
            onClick={() => void onSubmit()}
          >
            {isSubmitting ? (
              <>
                <LoadingIndicator size="sm" />
                <span className="sr-only">Sending</span>
              </>
            ) : (
              'Send'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
