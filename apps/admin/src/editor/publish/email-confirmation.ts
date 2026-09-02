import type { Email, PostStatus } from '@tryghost/admin-x-framework/api/posts';

export const CONFIRM_EMAIL_POLL_LENGTH = 1000;
export const CONFIRM_EMAIL_MAX_POLL_LENGTH = 15 * 1000;

export interface EmailConfirmationPost {
  status?: PostStatus;
  email?: Email | null;
}

export type EmailConfirmationOutcome =
  | { kind: 'submitted' }
  | { kind: 'failed'; error: string | null; partial: boolean }
  | { kind: 'timeout' }
  | { kind: 'cancelled' };

export type TimerHandle = unknown;

export interface EmailConfirmationOptions {
  reload: (postId: string) => Promise<EmailConfirmationPost>;
  retry: (emailId: string) => Promise<void>;
  setTimeout?: (callback: () => void, delay: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
}

export interface EmailConfirmation {
  confirm(postId: string, currentPost?: EmailConfirmationPost): Promise<EmailConfirmationOutcome>;
  retryAndConfirm(postId: string, emailId: string): Promise<EmailConfirmationOutcome>;
  cancel(): void;
}

// A partially delivered send is only distinguishable by the word "partially"
// appearing in the error message the API stores on the email.
export function isPartialEmailFailure(error?: string | null): boolean {
  return !!error && error.includes('partially');
}

function failureOutcome(email?: Email | null): EmailConfirmationOutcome {
  const error = email?.error ?? null;
  return { kind: 'failed', error, partial: isPartialEmailFailure(error) };
}

export function createEmailConfirmation(options: EmailConfirmationOptions): EmailConfirmation {
  const { reload, retry } = options;
  const schedule =
    options.setTimeout ?? ((callback: () => void, delay: number) => setTimeout(callback, delay));
  const unschedule =
    options.clearTimeout ??
    ((handle: TimerHandle) => clearTimeout(handle as Parameters<typeof clearTimeout>[0]));

  let inFlight: Promise<EmailConfirmationOutcome> | null = null;
  let cancelled = false;
  let pendingTimer: TimerHandle = null;
  let releasePendingWait: (() => void) | null = null;

  function wait(delay: number): Promise<void> {
    return new Promise<void>((resolve) => {
      releasePendingWait = resolve;
      pendingTimer = schedule(() => {
        pendingTimer = null;
        releasePendingWait = null;
        resolve();
      }, delay);
    });
  }

  function cancel(): void {
    cancelled = true;

    if (pendingTimer !== null) {
      unschedule(pendingTimer);
      pendingTimer = null;
    }

    releasePendingWait?.();
    releasePendingWait = null;
  }

  async function poll(
    postId: string,
    { stopWhenUnpublished }: { stopWhenUnpublished: boolean },
  ): Promise<EmailConfirmationOutcome> {
    let pollTimeout = 0;

    while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
      await wait(CONFIRM_EMAIL_POLL_LENGTH);

      if (cancelled) {
        return { kind: 'cancelled' };
      }

      pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

      const post = await reload(postId);

      if (cancelled) {
        return { kind: 'cancelled' };
      }

      // A post that is no longer published or sent never sends or retries an
      // email, so give up the same way as running out of attempts.
      if (stopWhenUnpublished && post.status !== 'sent' && post.status !== 'published') {
        return { kind: 'timeout' };
      }

      if (post.email?.status === 'submitted') {
        return { kind: 'submitted' };
      }

      if (post.email?.status === 'failed') {
        return failureOutcome(post.email);
      }
    }

    return { kind: 'timeout' };
  }

  function run(work: () => Promise<EmailConfirmationOutcome>): Promise<EmailConfirmationOutcome> {
    if (inFlight) {
      return inFlight;
    }

    cancelled = false;

    const started = work();
    const settle = () => {
      if (inFlight === started) {
        inFlight = null;
      }
    };

    inFlight = started;
    started.then(settle, settle);

    return started;
  }

  return {
    confirm(postId, currentPost) {
      return run(async () => {
        if (currentPost && (!currentPost.email || currentPost.email.status === 'submitted')) {
          return { kind: 'submitted' };
        }

        return poll(postId, { stopWhenUnpublished: true });
      });
    },

    retryAndConfirm(postId, emailId) {
      return run(async () => {
        await retry(emailId);

        if (cancelled) {
          return { kind: 'cancelled' };
        }

        return poll(postId, { stopWhenUnpublished: false });
      });
    },

    cancel,
  };
}
