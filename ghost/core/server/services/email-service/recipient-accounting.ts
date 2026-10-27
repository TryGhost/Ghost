import { EmailError } from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import logging from '@tryghost/logging';

// Only message is persisted to emails.error and displayed by the newsletter banner.
const messages = {
  preparationError: 'An error occurred while preparing your newsletter. Please try again.',
  verificationError:
    'An error occurred while checking your newsletter’s recipients. Sending has stopped.',
};

export const RECIPIENT_VERIFICATION_CODE = 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED';

export function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function countsDiffer(expected: unknown, actual: unknown): boolean {
  return isCount(expected) && isCount(actual) && expected !== actual;
}

export function missingRecipientFields(member: Record<string, unknown>): string[] {
  return ['id', 'uuid', 'email'].filter((field) => !member[field]);
}

export function recipientVerificationError(
  emailId: string | null,
  reason: string,
  details: Record<string, unknown> = {},
  { canRebuild = false, countMismatch = false } = {},
): EmailError & { retryable: false } {
  const confirmedCountMismatch = countMismatch && countsDiffer(details.expected, details.actual);
  // Read retryable on the raw error: GhostError wrapping drops false-valued properties.
  const error = Object.assign(
    new EmailError({
      code: RECIPIENT_VERIFICATION_CODE,
      message: tpl(canRebuild ? messages.preparationError : messages.verificationError),
      errorDetails: JSON.stringify({
        ...details,
        code: RECIPIENT_VERIFICATION_CODE,
        email_id: emailId,
        reason,
        can_rebuild: canRebuild,
        count_mismatch: confirmedCountMismatch,
      }),
    }),
    { retryable: false as const },
  );
  // The failed invariant determines the event; diagnostic count fields alone do
  // not turn an ownership or lifecycle failure into a count mismatch.
  logging.error(
    {
      err: error,
      event: {
        name: confirmedCountMismatch
          ? 'email.recipient_count.mismatch'
          : 'email.verification.failed',
      },
      code: RECIPIENT_VERIFICATION_CODE,
      email_id: emailId,
      reason,
      ...details,
    },
    'Newsletter recipient verification failed',
  );
  return error;
}

export function excludedRecipientError(
  emailId: string | null,
  eventName: 'email.preparation.excluded' | 'email.submission.excluded',
  reason: string,
  details: Record<string, unknown>,
): EmailError {
  const fields = { ...details, email_id: emailId, reason };
  const error = new EmailError({
    code: 'BULK_EMAIL_INVALID_RECIPIENT',
    message: 'Member excluded from newsletter due to invalid recipient data',
    errorDetails: JSON.stringify(fields),
  });
  logging.error({ err: error, event: { name: eventName }, ...fields }, error.message);
  return error;
}
