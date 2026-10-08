import { APIError } from '@tryghost/admin-x-framework/errors';
import { reportEditorError, reportEditorNotice } from '@/editor/report-error';
import { LimitCheckError } from './publish-options';

/** What the writer was shown, as Sentry's `publish_failure` tag. */
export type PublishFailureKind =
  | 'limit-check'
  | 'publish-inputs'
  | 'retry-eligibility'
  | 'retry-request'
  | 'email-failed'
  | 'email-unconfirmed'
  | 'no-command';

/**
 * A response Core chose to send, or no response at all: a refusal the writer
 * reads and acts on (validation, a host limit, permissions, an expired session)
 * or a lost connection. Neither is a fault in the flow.
 */
export function isExpectedRefusal(error: unknown): boolean {
  const cause = error instanceof LimitCheckError ? error.cause : error;

  if (!(cause instanceof APIError)) {
    return false;
  }

  const status = cause.response?.status;
  // No response is a lost connection or a timeout.
  return status === undefined || (status >= 400 && status < 500);
}

/**
 * Reports a failure the publish flow showed the writer, by the text they read.
 * Expected refusals are left out, as `reportSaveFailure` leaves them out of saves.
 */
export function reportPublishFailure(
  kind: PublishFailureKind,
  message: string,
  { error, postId }: { error?: unknown; postId?: string } = {},
): void {
  if (error !== undefined && isExpectedRefusal(error)) {
    return;
  }

  const context = {
    tags: { shown_to_user: true, source: 'publish-flow', publish_failure: kind },
    contexts: { ghost: { displayed_message: message } },
    extra: { post_id: postId },
  };

  if (error instanceof Error) {
    reportEditorError(error, context);
  } else {
    reportEditorNotice(message, context);
  }
}
