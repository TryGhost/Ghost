import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONFIRM_EMAIL_MAX_POLL_LENGTH,
  CONFIRM_EMAIL_POLL_LENGTH,
  type EmailConfirmationPost,
  createEmailConfirmation,
  isPartialEmailFailure,
} from './email-confirmation';

const MAX_ATTEMPTS = CONFIRM_EMAIL_MAX_POLL_LENGTH / CONFIRM_EMAIL_POLL_LENGTH;

function published(email: EmailConfirmationPost['email']): EmailConfirmationPost {
  return { status: 'published', email };
}

const pending = published({ status: 'pending', opened_count: 0, email_count: 1 });
const submitted = published({ status: 'submitted', opened_count: 0, email_count: 1 });

function failed(error: string | null) {
  return published({ status: 'failed', error, opened_count: 0, email_count: 1 });
}

function setup(reloads: EmailConfirmationPost[]) {
  const reload = vi.fn(() =>
    Promise.resolve(reloads[Math.min(reload.mock.calls.length, reloads.length) - 1]),
  );
  const retry = vi.fn(() => Promise.resolve());

  return { reload, retry, confirmation: createEmailConfirmation({ reload, retry }) };
}

async function advance(times: number) {
  for (let index = 0; index < times; index += 1) {
    await vi.advanceTimersByTimeAsync(CONFIRM_EMAIL_POLL_LENGTH);
  }
}

describe('createEmailConfirmation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pins the poll interval to a second and the poll window to fifteen seconds', () => {
    expect(CONFIRM_EMAIL_POLL_LENGTH).toBe(1000);
    expect(CONFIRM_EMAIL_MAX_POLL_LENGTH).toBe(15000);
  });

  it('polls until the email is submitted', async () => {
    const { reload, confirmation } = setup([pending, pending, submitted]);

    const result = confirmation.confirm('post-1');
    await advance(3);

    await expect(result).resolves.toEqual({ kind: 'submitted' });
    expect(reload).toHaveBeenCalledTimes(3);
    expect(reload).toHaveBeenCalledWith('post-1');
  });

  it('does not poll when the supplied post already has a submitted email', async () => {
    const { reload, confirmation } = setup([submitted]);

    await expect(confirmation.confirm('post-1', submitted)).resolves.toEqual({ kind: 'submitted' });
    expect(reload).not.toHaveBeenCalled();
  });

  it('reports the supplied post having no email as nothing to confirm', async () => {
    const { reload, confirmation } = setup([submitted]);

    await expect(confirmation.confirm('post-1', { status: 'published' })).resolves.toEqual({
      kind: 'not-needed',
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it('reports a reloaded post having no email as nothing to confirm', async () => {
    const { reload, confirmation } = setup([{ status: 'published' }]);

    const result = confirmation.confirm('post-1');
    await advance(1);

    await expect(result).resolves.toEqual({ kind: 'not-needed' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while the email is still submitting', async () => {
    const { reload, confirmation } = setup([
      published({ status: 'submitting', opened_count: 0, email_count: 1 }),
      submitted,
    ]);

    const result = confirmation.confirm('post-1');
    await advance(2);

    await expect(result).resolves.toEqual({ kind: 'submitted' });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('reports a full failure with the email error', async () => {
    const { confirmation } = setup([failed('The email service returned an error.')]);

    const result = confirmation.confirm('post-1');
    await advance(1);

    await expect(result).resolves.toEqual({
      kind: 'failed',
      error: 'The email service returned an error.',
      partial: false,
    });
  });

  it('reports a partial failure when the error message says partially', async () => {
    const { confirmation } = setup([failed('Email was partially sent to 3 of 10 members.')]);

    const result = confirmation.confirm('post-1');
    await advance(1);

    await expect(result).resolves.toEqual({
      kind: 'failed',
      error: 'Email was partially sent to 3 of 10 members.',
      partial: true,
    });
  });

  it('reports a failure with a null error when the email has none', async () => {
    const { confirmation } = setup([failed(null)]);

    const result = confirmation.confirm('post-1');
    await advance(1);

    await expect(result).resolves.toEqual({ kind: 'failed', error: null, partial: false });
  });

  it('times out after the maximum number of attempts', async () => {
    const { reload, confirmation } = setup([pending]);

    const result = confirmation.confirm('post-1');
    await advance(MAX_ATTEMPTS);

    await expect(result).resolves.toEqual({ kind: 'timeout' });
    expect(reload).toHaveBeenCalledTimes(15);
  });

  it('is still polling one attempt before the timeout', async () => {
    const { confirmation } = setup([pending]);
    const settled = vi.fn();

    void confirmation.confirm('post-1').then(settled);
    await advance(MAX_ATTEMPTS - 1);

    expect(settled).not.toHaveBeenCalled();
  });

  it('stops polling once the post is no longer published or sent', async () => {
    const { reload, confirmation } = setup([{ status: 'draft', email: pending.email }, pending]);

    const result = confirmation.confirm('post-1');
    await advance(2);

    await expect(result).resolves.toEqual({ kind: 'unpublished' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('treats a sent post as still emailing', async () => {
    const { confirmation } = setup([{ status: 'sent', email: submitted.email }]);

    const result = confirmation.confirm('post-1');
    await advance(1);

    await expect(result).resolves.toEqual({ kind: 'submitted' });
  });

  it('rejects when a reload fails instead of continuing to poll', async () => {
    const transportError = new Error('Network request failed');
    const reload = vi.fn().mockRejectedValue(transportError);
    const retry = vi.fn(() => Promise.resolve());
    const confirmation = createEmailConfirmation({ reload, retry });

    const result = confirmation.confirm('post-1');
    const assertion = expect(result).rejects.toBe(transportError);
    await advance(MAX_ATTEMPTS);

    await assertion;
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('retries the email and then polls for submission', async () => {
    const { reload, retry, confirmation } = setup([pending, submitted]);

    const result = confirmation.retryAndConfirm('post-1', 'email-1');
    await advance(2);

    await expect(result).resolves.toEqual({ kind: 'submitted' });
    expect(retry).toHaveBeenCalledWith('email-1');
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('reports a failed retry with partial detection', async () => {
    const { confirmation } = setup([failed('Email was partially sent.')]);

    const result = confirmation.retryAndConfirm('post-1', 'email-1');
    await advance(1);

    await expect(result).resolves.toEqual({
      kind: 'failed',
      error: 'Email was partially sent.',
      partial: true,
    });
  });

  it('keeps polling a retry even when the post is no longer published', async () => {
    const { reload, confirmation } = setup([
      { status: 'draft', email: pending.email },
      { status: 'draft', email: submitted.email },
    ]);

    const result = confirmation.retryAndConfirm('post-1', 'email-1');
    await advance(2);

    await expect(result).resolves.toEqual({ kind: 'submitted' });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('rejects when the retry request fails', async () => {
    const transportError = new Error('Unable to connect');
    const reload = vi.fn(() => Promise.resolve(pending));
    const retry = vi.fn().mockRejectedValue(transportError);
    const confirmation = createEmailConfirmation({ reload, retry });

    await expect(confirmation.retryAndConfirm('post-1', 'email-1')).rejects.toBe(transportError);
    expect(reload).not.toHaveBeenCalled();
  });

  it('settles as cancelled and clears the pending timer when cancelled mid-poll', async () => {
    const { reload, retry } = setup([pending]);
    const clearedHandles: unknown[] = [];
    const confirmation = createEmailConfirmation({
      reload,
      retry,
      setTimeout: (callback, delay) => setTimeout(callback, delay),
      clearTimeout: (handle) => {
        clearedHandles.push(handle);
        clearTimeout(handle as Parameters<typeof clearTimeout>[0]);
      },
    });

    const result = confirmation.confirm('post-1');
    await advance(2);
    confirmation.cancel();

    await expect(result).resolves.toEqual({ kind: 'cancelled' });
    expect(clearedHandles).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);

    await advance(MAX_ATTEMPTS);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('settles as cancelled when cancelled while a reload is in flight', async () => {
    let releaseReload: (post: EmailConfirmationPost) => void = () => {};
    const reload = vi.fn(
      () =>
        new Promise<EmailConfirmationPost>((resolve) => {
          releaseReload = resolve;
        }),
    );
    const confirmation = createEmailConfirmation({ reload, retry: () => Promise.resolve() });

    const result = confirmation.confirm('post-1');
    await advance(1);
    confirmation.cancel();

    await expect(result).resolves.toEqual({ kind: 'cancelled' });
    releaseReload(submitted);
  });

  it('settles as cancelled when cancelled during the retry request', async () => {
    let releaseRetry: () => void = () => {};
    const { reload } = setup([submitted]);
    const retry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseRetry = resolve;
        }),
    );
    const confirmation = createEmailConfirmation({ reload, retry });

    const result = confirmation.retryAndConfirm('post-1', 'email-1');
    confirmation.cancel();

    await expect(result).resolves.toEqual({ kind: 'cancelled' });
    releaseRetry();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reject when an abandoned reload fails after cancellation', async () => {
    let rejectReload: (error: Error) => void = () => {};
    const transportError = new Error('Late network failure');
    const reload = vi.fn(
      () =>
        new Promise<EmailConfirmationPost>((_resolve, reject) => {
          rejectReload = reject;
        }),
    );
    const confirmation = createEmailConfirmation({ reload, retry: () => Promise.resolve() });

    const result = confirmation.confirm('post-1');
    await advance(1);
    confirmation.cancel();
    rejectReload(transportError);

    await expect(result).resolves.toEqual({ kind: 'cancelled' });
  });

  it('accepts a new confirmation immediately after cancelling a stuck one', async () => {
    let releaseStuckReload: (post: EmailConfirmationPost) => void = () => {};
    const reload = vi.fn(() => {
      if (reload.mock.calls.length > 1) {
        return Promise.resolve(submitted);
      }

      return new Promise<EmailConfirmationPost>((resolve) => {
        releaseStuckReload = resolve;
      });
    });
    const confirmation = createEmailConfirmation({ reload, retry: () => Promise.resolve() });

    const abandoned = confirmation.confirm('post-1');
    await advance(1);
    confirmation.cancel();

    const restarted = confirmation.confirm('post-1');
    expect(restarted).not.toBe(abandoned);

    await advance(1);

    await expect(restarted).resolves.toEqual({ kind: 'submitted' });
    await expect(abandoned).resolves.toEqual({ kind: 'cancelled' });
    expect(reload).toHaveBeenCalledTimes(2);
    releaseStuckReload(submitted);
  });

  it('coalesces a repeat confirmation of the same post', async () => {
    const { reload, confirmation } = setup([pending, submitted]);

    const first = confirmation.confirm('post-1');
    const second = confirmation.confirm('post-1');
    expect(second).toBe(first);

    await advance(2);

    await expect(first).resolves.toEqual({ kind: 'submitted' });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('abandons the run in progress when a different post is confirmed', async () => {
    const posts: Record<string, EmailConfirmationPost> = {
      'post-1': pending,
      'post-2': submitted,
    };
    const reload = vi.fn((postId: string) => Promise.resolve(posts[postId]));
    const confirmation = createEmailConfirmation({ reload, retry: () => Promise.resolve() });

    const abandoned = confirmation.confirm('post-1');
    await advance(1);

    const started = confirmation.confirm('post-2');
    expect(started).not.toBe(abandoned);
    await advance(1);

    await expect(abandoned).resolves.toEqual({ kind: 'cancelled' });
    await expect(started).resolves.toEqual({ kind: 'submitted' });
    expect(reload).toHaveBeenCalledWith('post-2');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('abandons a confirmation in progress when the same post is retried', async () => {
    const { retry, confirmation } = setup([pending, submitted]);

    const abandoned = confirmation.confirm('post-1');
    await advance(1);

    const started = confirmation.retryAndConfirm('post-1', 'email-1');
    expect(started).not.toBe(abandoned);
    await advance(1);

    await expect(abandoned).resolves.toEqual({ kind: 'cancelled' });
    await expect(started).resolves.toEqual({ kind: 'submitted' });
    expect(retry).toHaveBeenCalledWith('email-1');
  });

  it('coalesces a repeat retry of the same post', async () => {
    const { retry, confirmation } = setup([submitted]);

    const first = confirmation.retryAndConfirm('post-1', 'email-1');
    const second = confirmation.retryAndConfirm('post-1', 'email-1');
    expect(second).toBe(first);

    await advance(1);

    await expect(first).resolves.toEqual({ kind: 'submitted' });
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('allows a new run once the previous one has settled', async () => {
    const { reload, confirmation } = setup([submitted]);

    const first = confirmation.confirm('post-1');
    await advance(1);
    await first;

    const second = confirmation.confirm('post-1');
    expect(second).not.toBe(first);
    await advance(1);

    await expect(second).resolves.toEqual({ kind: 'submitted' });
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

describe('isPartialEmailFailure', () => {
  it.each([
    ['Email was partially sent.', true],
    ['partially', true],
    ['The email failed to send.', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('reads %j as %s', (error, expected) => {
    expect(isPartialEmailFailure(error)).toBe(expected);
  });
});
