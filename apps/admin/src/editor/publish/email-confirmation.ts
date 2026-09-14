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
  | { kind: 'unpublished' }
  | { kind: 'timeout' }
  | { kind: 'not-needed' }
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

type RunOperation = 'confirm' | 'retry';

interface RunState {
  operation: RunOperation;
  postId: string;
  cancelled: boolean;
  timer: TimerHandle;
  release: (() => void) | null;
  settleCancelled: () => void;
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

  let current: { state: RunState; promise: Promise<EmailConfirmationOutcome> } | null = null;

  function wait(state: RunState, delay: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let fired = false;
      const release = () => {
        if (fired) {
          return;
        }

        fired = true;
        state.timer = null;
        state.release = null;
        resolve();
      };

      state.release = release;

      const handle = schedule(release, delay);

      // Only keep a handle that is still pending: a scheduler that runs its
      // callback synchronously has already finished with this one.
      if (!fired) {
        state.timer = handle;
      }
    });
  }

  function stop(state: RunState): void {
    state.cancelled = true;

    if (state.timer !== null) {
      unschedule(state.timer);
      state.timer = null;
    }

    state.release?.();
    state.release = null;
    state.settleCancelled();
  }

  function cancel(): void {
    if (!current) {
      return;
    }

    stop(current.state);
    current = null;
  }

  async function poll(
    state: RunState,
    { stopWhenUnpublished }: { stopWhenUnpublished: boolean },
  ): Promise<EmailConfirmationOutcome> {
    let pollTimeout = 0;

    while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
      await wait(state, CONFIRM_EMAIL_POLL_LENGTH);

      if (state.cancelled) {
        return { kind: 'cancelled' };
      }

      pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

      const post = await reload(state.postId);

      if (state.cancelled) {
        return { kind: 'cancelled' };
      }

      // A post that is no longer published or sent never sends or retries an
      // email, so there is nothing left to wait for.
      if (stopWhenUnpublished && post.status !== 'sent' && post.status !== 'published') {
        return { kind: 'unpublished' };
      }

      if (!post.email) {
        return { kind: 'not-needed' };
      }

      if (post.email.status === 'submitted') {
        return { kind: 'submitted' };
      }

      if (post.email.status === 'failed') {
        return failureOutcome(post.email);
      }
    }

    return { kind: 'timeout' };
  }

  function run(
    operation: RunOperation,
    postId: string,
    work: (state: RunState) => Promise<EmailConfirmationOutcome>,
  ): Promise<EmailConfirmationOutcome> {
    if (current) {
      if (current.state.operation === operation && current.state.postId === postId) {
        return current.promise;
      }

      // A run belongs to one operation on one post, so only an identical
      // repeat coalesces; anything else abandons the run in progress.
      stop(current.state);
      current = null;
    }

    let settleCancelled: () => void = () => {};
    const cancellation = new Promise<EmailConfirmationOutcome>((resolve) => {
      settleCancelled = () => resolve({ kind: 'cancelled' });
    });
    const state: RunState = {
      operation,
      postId,
      cancelled: false,
      timer: null,
      release: null,
      settleCancelled,
    };
    const promise = Promise.race([work(state), cancellation]);
    const settle = () => {
      if (current?.state === state) {
        current = null;
      }
    };

    current = { state, promise };
    promise.then(settle, settle);

    return promise;
  }

  return {
    confirm(postId, currentPost) {
      return run('confirm', postId, (state) => {
        if (currentPost && !currentPost.email) {
          return Promise.resolve({ kind: 'not-needed' });
        }

        if (currentPost?.email?.status === 'submitted') {
          return Promise.resolve({ kind: 'submitted' });
        }

        return poll(state, { stopWhenUnpublished: true });
      });
    },

    retryAndConfirm(postId, emailId) {
      return run('retry', postId, async (state) => {
        await retry(emailId);

        if (state.cancelled) {
          return { kind: 'cancelled' };
        }

        return poll(state, { stopWhenUnpublished: false });
      });
    },

    cancel,
  };
}
