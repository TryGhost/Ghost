import validator from 'validator';
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
import { type DocsBotSupportRequest, formatDocsBotHistory } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import {
  DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE,
  submitDocsBotSupportTicket,
} from './docsbot-support-ticket';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface DocsBotSupportTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportRequest: DocsBotSupportRequest;
  addBotMessage: (message: string) => Promise<unknown>;
  openWidget: () => Promise<unknown>;
}

function initialFormState(
  supportRequest: DocsBotSupportRequest,
  currentUser?: { name?: string; email?: string },
): FormState {
  return {
    name: supportRequest.metadata.name || currentUser?.name || '',
    email: supportRequest.metadata.email || currentUser?.email || '',
    subject: supportRequest.ticket?.subject || '',
    message: supportRequest.ticket?.message || '',
  };
}

export function DocsBotSupportTicketModal({
  open,
  onOpenChange,
  supportRequest,
  addBotMessage,
  openWidget,
}: DocsBotSupportTicketModalProps) {
  const handleError = useHandleError();
  const { data: currentUser } = useCurrentUser();
  const { data: siteData } = useBrowseSite();

  const { formState, updateForm, handleSave, saveState, errors, clearError } = useForm<FormState>({
    initialState: initialFormState(supportRequest, currentUser),
    onSave: async (state) => {
      await submitDocsBotSupportTicket({
        name: state.name.trim(),
        email: state.email.trim(),
        subject: state.subject.trim(),
        message: state.message.trim(),
        history: formatDocsBotHistory(supportRequest.history),
        rawHistory: supportRequest.history,
        siteUrl: siteData?.site.url ?? '',
        currentUrl: supportRequest.currentUrl,
        metadata: supportRequest.metadata,
      });
    },
    onSaveError: handleError,
    onValidate: (state) => {
      const newErrors: Record<string, string> = {};

      if (!state.name.trim()) {
        newErrors.name = 'Enter your name';
      }

      if (!state.email.trim()) {
        newErrors.email = 'Enter your email';
      } else if (!validator.isEmail(state.email.trim())) {
        newErrors.email = 'Enter a valid email address';
      }

      if (!state.subject.trim()) {
        newErrors.subject = 'Enter a subject';
      }

      if (!state.message.trim()) {
        newErrors.message = 'Enter a message';
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

    try {
      await addBotMessage(DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DocsBot] Failed to add confirmation message:', error);
    }

    onOpenChange(false);
    void openWidget();
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
      <DialogContent data-testid="docsbot-support-ticket-modal">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Review the details below and add any extra context before sending.
          </DialogDescription>
        </DialogHeader>
        <Stack gap="lg">
          <Field data-invalid={Boolean(errors.name) || undefined}>
            <FieldLabel htmlFor="docsbot-support-name">Name</FieldLabel>
            <Input
              aria-invalid={Boolean(errors.name) || undefined}
              disabled={isSubmitting}
              id="docsbot-support-name"
              value={formState.name}
              onChange={(event) => updateForm((state) => ({ ...state, name: event.target.value }))}
              onKeyDown={() => clearError('name')}
            />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(errors.email) || undefined}>
            <FieldLabel htmlFor="docsbot-support-email">Email</FieldLabel>
            <Input
              aria-invalid={Boolean(errors.email) || undefined}
              disabled={isSubmitting}
              id="docsbot-support-email"
              type="email"
              value={formState.email}
              onChange={(event) => updateForm((state) => ({ ...state, email: event.target.value }))}
              onKeyDown={() => clearError('email')}
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(errors.subject) || undefined}>
            <FieldLabel htmlFor="docsbot-support-subject">Subject</FieldLabel>
            <Input
              aria-invalid={Boolean(errors.subject) || undefined}
              disabled={isSubmitting}
              id="docsbot-support-subject"
              value={formState.subject}
              onChange={(event) =>
                updateForm((state) => ({ ...state, subject: event.target.value }))
              }
              onKeyDown={() => clearError('subject')}
            />
            {errors.subject && <FieldError>{errors.subject}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(errors.message) || undefined}>
            <FieldLabel htmlFor="docsbot-support-message">Message</FieldLabel>
            <Textarea
              aria-invalid={Boolean(errors.message) || undefined}
              disabled={isSubmitting}
              id="docsbot-support-message"
              rows={6}
              value={formState.message}
              onChange={(event) =>
                updateForm((state) => ({ ...state, message: event.target.value }))
              }
              onKeyDown={() => clearError('message')}
            />
            <FieldDescription>
              Add any extra context before sending. The DocsBot conversation will be attached
              automatically.
            </FieldDescription>
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
            data-testid="docsbot-support-send"
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
              'Send ticket'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
