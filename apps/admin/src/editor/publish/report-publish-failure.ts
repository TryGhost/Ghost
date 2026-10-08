import { isExpectedFailure, reportEditorError, reportEditorNotice } from '@/editor/report-error';
import { LimitCheckError } from './publish-options';

/** What the writer was shown, as Sentry's `publish_failure` tag. */
export type PublishFailureKind =
  | 'limit-check'
  | 'publish-inputs'
  | 'pre-publish-save'
  | 'publish-request'
  | 'revert-request'
  | 'retry-eligibility'
  | 'retry-request'
  | 'email-failed'
  | 'email-unconfirmed'
  | 'no-command';

/**
 * Whether a failure is expected rather than a fault in the flow, by the rule saves
 * are reported by (`isExpectedSaveError()`): validation, a host limit, a writer who
 * lost access, an expired session and a lost connection are left out.
 */
export function isExpectedRefusal(error: unknown): boolean {
  return isExpectedFailure(error instanceof LimitCheckError ? error.cause : error);
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
