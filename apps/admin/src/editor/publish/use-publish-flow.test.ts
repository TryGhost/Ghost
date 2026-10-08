import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  JSONError,
  UnauthorizedError,
  type ErrorResponse,
} from '@tryghost/admin-x-framework/errors';
import {
  EMAIL_UNCONFIRMED,
  MIN_EMAIL_HANDOFF_LENGTH,
  SCHEDULE_PASSED,
  usePublishFlow,
  type PublishFlowOptions,
} from './use-publish-flow';
import { EmailRetryRequestError, type EmailConfirmationOutcome } from './email-confirmation';
import { LimitCheckError, type NewsletterInput } from './publish-options';
import { reportPublishFailure } from './report-publish-failure';
import { CompletionFailureError } from './completion-message';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import type { SaveCompletion } from '@/editor/engine/save-engine';

const transport = vi.hoisted(() => ({ fetchApi: vi.fn(), retryEmail: vi.fn() }));
const eligibility = vi.hoisted(
  (): { isError: boolean; hasData: boolean; error?: unknown; refetch?: unknown } => ({
    isError: false,
    hasData: true,
  }),
);
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFetchApi: () => transport.fetchApi }));
vi.mock('@tryghost/admin-x-framework/api/emails', () => ({
  useEmailSendingStatus: () => ({
    isFetchedAfterMount: true,
    isError: eligibility.isError,
    isFetching: false,
    error: eligibility.isError ? (eligibility.error ?? new Error('Status read failed')) : null,
    refetch: eligibility.refetch ?? vi.fn(),
    data: eligibility.hasData
      ? { email_statuses: [{ sending: { status: 'failed', retryable: true } }] }
      : undefined,
  }),
  useRetryEmail: () => ({ mutateAsync: transport.retryEmail }),
}));

// A confirmation each spec settles itself; tearing the flow down settles it as cancelled.
const confirmation = vi.hoisted(() => ({
  settle: undefined as ((outcome: EmailConfirmationOutcome) => void) | undefined,
  fail: undefined as ((error: unknown) => void) | undefined,
}));
vi.mock('./email-confirmation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./email-confirmation')>()),
  createEmailConfirmation: () => ({
    confirm: () =>
      new Promise<EmailConfirmationOutcome>((resolve, reject) => {
        confirmation.settle = resolve;
        confirmation.fail = reject;
      }),
    retryAndConfirm: () =>
      new Promise<EmailConfirmationOutcome>((resolve, reject) => {
        confirmation.settle = resolve;
        confirmation.fail = reject;
      }),
    cancel: () => confirmation.settle?.({ kind: 'cancelled' }),
  }),
}));

vi.mock('./report-publish-failure', () => ({ reportPublishFailure: vi.fn() }));

const NOW = new Date('2026-09-02T10:00:00.000Z');
const SCHEDULED_AT = '2026-09-03T10:00:00.000Z';
const WEEKLY: NewsletterInput = { slug: 'weekly', name: 'Weekly', status: 'active', sortOrder: 0 };
const DAILY: NewsletterInput = { slug: 'daily', name: 'Daily', status: 'active', sortOrder: 1 };

function options(): PublishFlowOptions {
  return {
    post: {
      id: 'post-1',
      displayName: 'post',
      status: 'draft',
      title: 'Hello',
      visibility: 'public',
    },
    site: {
      membersEnabled: true,
      mailgunConfigured: true,
      memberCount: 100,
      newsletters: [WEEKLY, DAILY],
      editorDefaultEmailRecipients: 'visibility',
      editorDefaultEmailRecipientsFilter: null,
    },
    user: { isAdmin: true, isAuthorOrContributor: false },
    now: () => NOW,
    dispatch: vi.fn().mockResolvedValue({
      kind: 'saved',
      executedAs: 'schedule',
      result: { id: 'post-1', status: 'scheduled', updatedAt: NOW.toISOString() },
    }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient() }, children);
}

afterEach(() => {
  eligibility.isError = false;
  eligibility.hasData = true;
  eligibility.error = undefined;
  eligibility.refetch = undefined;
  confirmation.fail = undefined;
  localStorage.clear();
  vi.clearAllMocks();
  confirmation.settle = undefined;
});

describe('publish option actions', () => {
  it('renders changed options and confirms the same command without a caller refresh', async () => {
    const inputs = options();
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));

    act(() => result.current.setPublishType('send'));
    expect(result.current.state.willOnlyEmail).toBe(true);

    act(() => result.current.setNewsletter(DAILY));
    expect(result.current.state.newsletter?.slug).toBe('daily');

    act(() => result.current.setRecipientFilter('label:vip'));
    expect(result.current.state.recipientFilter).toBe('label:vip');

    act(() => result.current.setIsScheduled(true));
    expect(result.current.state.isScheduled).toBe(true);

    act(() => result.current.setScheduledAt(new Date(SCHEDULED_AT)));
    expect(result.current.state.scheduledAt).toBe(SCHEDULED_AT);

    act(() => result.current.toConfirm());
    expect(result.current.step).toBe('confirm');
    expect(result.current.captured).toMatchObject({ isScheduled: true, willOnlyEmail: true });
    await act(() => result.current.confirmPublish());
    expect(inputs.dispatch).toHaveBeenCalledWith({
      kind: 'schedule',
      options: {
        publishedAt: SCHEDULED_AT,
        emailOnly: true,
        newsletter: 'daily',
        emailSegment: 'label:vip',
      },
    });
    expect(result.current.step).toBe('complete');
  });

  it('keeps actions and selections through caller rerenders', async () => {
    const inputs = options();
    const { result, rerender } = renderHook((props) => usePublishFlow(props), {
      initialProps: inputs,
      wrapper,
    });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    const setNewsletter = result.current.setNewsletter;
    act(() => setNewsletter(DAILY));
    rerender({ ...inputs, site: { ...inputs.site } });
    expect(result.current.setNewsletter).toBe(setNewsletter);
    expect(result.current.state.newsletter?.slug).toBe('daily');

    act(() => setNewsletter(WEEKLY));
    expect(result.current.state.newsletter?.slug).toBe('weekly');
    expect(inputs.dispatch).not.toHaveBeenCalled();
  });
});

describe('a publish that rejects before it settles', () => {
  async function confirmWith(overrides: Partial<PublishFlowOptions>) {
    const inputs = { ...options(), ...overrides };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    act(() => result.current.toConfirm());
    await act(() => result.current.confirmPublish());
    return result;
  }

  it('reports a dispatch that rejects, showing the generic failure', async () => {
    const fault = new TypeError('Cannot read properties of undefined');
    const result = await confirmWith({ dispatch: vi.fn().mockRejectedValue(fault) });

    expect(result.current.confirmStatus).toBe('failure');
    expect(reportPublishFailure).toHaveBeenCalledWith(
      'publish-request',
      result.current.failure?.message,
      { error: fault, postId: 'post-1' },
    );
  });

  it('reports a pre-publish save that rejects unexpectedly', async () => {
    const fault = new Error('Engine stopped');
    await confirmWith({ onBeforePublish: vi.fn().mockRejectedValue(fault) });

    expect(reportPublishFailure).toHaveBeenCalledWith('pre-publish-save', 'Engine stopped', {
      error: fault,
      postId: 'post-1',
    });
  });

  it('leaves a pre-publish save that settled as failed to the session’s own report', async () => {
    const failed = new CompletionFailureError({ message: 'Title is too long.' });
    const result = await confirmWith({ onBeforePublish: vi.fn().mockRejectedValue(failed) });

    expect(result.current.failure).toEqual({ message: 'Title is too long.' });
    expect(reportPublishFailure).not.toHaveBeenCalled();
  });
});

describe('a schedule that passes before it is confirmed', () => {
  /** Schedules at the default ten minutes ahead, reviews it, then lets the time pass. */
  async function reviewThenWait() {
    let clock = NOW;
    const inputs = { ...options(), now: () => clock, onBeforePublish: vi.fn() };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));

    act(() => result.current.setIsScheduled(true));
    act(() => result.current.toConfirm());
    clock = new Date(NOW.getTime() + 11 * 60 * 1000);

    return { inputs, result };
  }

  it('saves nothing and asks for a new time', async () => {
    const { inputs, result } = await reviewThenWait();

    await act(() => result.current.confirmPublish());

    expect(inputs.onBeforePublish).not.toHaveBeenCalled();
    expect(inputs.dispatch).not.toHaveBeenCalled();
    expect(result.current.step).toBe('confirm');
    expect(result.current.confirmStatus).toBe('failure');
    expect(result.current.failure).toEqual({ message: SCHEDULE_PASSED });
    // Still scheduled: the refusal never turns the choice into an immediate publish.
    expect(result.current.state.isScheduled).toBe(true);
  });

  it('refuses a time that passes while the editor saves first', async () => {
    let clock = NOW;
    // A save held by a sign-in can outlast the chosen time.
    let finishSave = () => {};
    const onBeforePublish = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    const inputs = { ...options(), now: () => clock, onBeforePublish };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    act(() => result.current.setIsScheduled(true));
    act(() => result.current.toConfirm());

    let confirming: Promise<void> = Promise.resolve();
    act(() => {
      confirming = result.current.confirmPublish();
    });
    expect(onBeforePublish).toHaveBeenCalledTimes(1);

    // The time passes only while the save is still pending.
    clock = new Date(NOW.getTime() + 11 * 60 * 1000);
    await act(async () => {
      finishSave();
      await confirming;
    });

    expect(inputs.dispatch).not.toHaveBeenCalled();
    expect(result.current.confirmStatus).toBe('failure');
    expect(result.current.failure).toEqual({ message: SCHEDULE_PASSED });
    expect(result.current.state.isScheduled).toBe(true);
    // No longer running, so the writer can go back for another time.
    act(() => result.current.toOptions());
    expect(result.current.step).toBe('options');
  });

  it('still schedules when the time is ahead once the editor has saved', async () => {
    let clock = NOW;
    const onBeforePublish = vi.fn(() => {
      clock = new Date(NOW.getTime() + 60 * 1000);
      return Promise.resolve();
    });
    const inputs = { ...options(), now: () => clock, onBeforePublish };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    act(() => result.current.setIsScheduled(true));
    act(() => result.current.toConfirm());

    await act(() => result.current.confirmPublish());

    expect(result.current.failure).toBeNull();
    expect(vi.mocked(inputs.dispatch).mock.calls[0]?.[0]).toMatchObject({ kind: 'schedule' });
  });

  it('schedules once a future time is chosen', async () => {
    const { inputs, result } = await reviewThenWait();
    await act(() => result.current.confirmPublish());

    act(() => result.current.toOptions());
    act(() => result.current.setScheduledAt(new Date(SCHEDULED_AT)));
    act(() => result.current.toConfirm());
    expect(result.current.failure).toBeNull();
    await act(() => result.current.confirmPublish());

    expect(inputs.dispatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(inputs.dispatch).mock.calls[0]?.[0]).toMatchObject({
      kind: 'schedule',
      options: { publishedAt: SCHEDULED_AT },
    });
  });
});

describe('post reads after an emailed publish', () => {
  /** Publishes and emails, leaving the flow waiting on its email confirmation. */
  async function publishAndEmail() {
    const client = new QueryClient();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const inputs = options();
    const { result } = renderHook(() => usePublishFlow(inputs), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children),
    });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    expect(result.current.state.willEmailImmediately).toBe(true);

    act(() => result.current.toConfirm());
    let publishing: Promise<void> = Promise.resolve();
    act(() => {
      publishing = result.current.confirmPublish();
    });
    await waitFor(() => expect(confirmation.settle).toBeDefined());

    return { result, invalidateQueries, publishing };
  }

  it('refreshes them once the send is confirmed', async () => {
    const { invalidateQueries, publishing } = await publishAndEmail();

    await act(async () => {
      confirmation.settle?.({ kind: 'submitted' });
      await publishing;
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['PostsResponseType'] });
  });

  it.each([null, ''])('keeps a failed send recoverable with error %j', async (error) => {
    const { result, invalidateQueries, publishing } = await publishAndEmail();

    await act(async () => {
      confirmation.settle?.({ kind: 'failed', error, partial: false });
      await publishing;
    });

    expect(result.current.step).toBe('email-error');
    expect(result.current.emailErrorMessage).toBe('Unknown error');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['PostsResponseType'] });
  });

  it('leaves them alone when the flow is closed before the send is confirmed', async () => {
    const { result, invalidateQueries, publishing } = await publishAndEmail();

    await act(async () => {
      result.current.cancel();
      await publishing;
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('sends under improveSendingUI', () => {
  const FAILED_EMAIL = {
    id: 'email-1',
    status: 'failed' as const,
    error: 'The email service was unavailable.',
    email_count: 20,
    opened_count: 0,
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Confirms a send on fake timers, so its save and hand-off can be stepped through. */
  async function confirmSend(inputs: PublishFlowOptions, publishType?: 'send') {
    inputs.improveSendingUI = true;
    inputs.onCompleted = vi.fn();
    const { result, unmount } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    if (publishType) {
      act(() => result.current.setPublishType(publishType));
    }
    expect(result.current.state.willEmailImmediately).toBe(true);
    act(() => result.current.toConfirm());

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    let publishing: Promise<void> = Promise.resolve();
    act(() => {
      publishing = result.current.confirmPublish();
    });

    return { result, publishing, unmount };
  }

  /** A save the server acknowledges after `delay`. */
  function savesAfter(
    delay: number,
    completion: SaveCompletion = {
      kind: 'saved',
      executedAs: 'publish',
      result: { id: 'post-1', status: 'published', updatedAt: NOW.toISOString() },
    },
  ) {
    return vi.fn(
      () =>
        new Promise<SaveCompletion>((resolve) => {
          setTimeout(() => resolve(completion), delay);
        }),
    );
  }

  async function advance(delay: number) {
    await act(() => vi.advanceTimersByTimeAsync(delay));
  }

  it.each([
    ['a publish that emails', {}, undefined],
    ['an email-only send', {}, 'send' as const],
    ['a draft whose earlier send failed', { email: FAILED_EMAIL }, undefined],
  ])('hands %s off once it has run for the minimum length', async (_case, post, publishType) => {
    const inputs = options();
    inputs.post = { ...inputs.post, ...post };
    inputs.dispatch = savesAfter(400);
    const { result, publishing } = await confirmSend(inputs, publishType);

    await advance(MIN_EMAIL_HANDOFF_LENGTH - 1);
    expect(inputs.dispatch).toHaveBeenCalledTimes(1);
    expect(inputs.onCompleted).not.toHaveBeenCalled();
    expect(result.current.confirmStatus).toBe('running');

    // The minimum runs from the click, so the save's own time counts towards it.
    await advance(1);
    expect(inputs.onCompleted).toHaveBeenCalledWith({
      postId: 'post-1',
      isScheduled: false,
      hasEmail: true,
    });
    await act(() => publishing);
    // The hold replaces the poll rather than running alongside it.
    expect(confirmation.settle).toBeUndefined();
    expect(result.current.step).toBe('complete');
    expect(result.current.emailNote).toBeNull();
  });

  it('hands a send off as soon as a save slower than the minimum lands', async () => {
    const inputs = options();
    inputs.dispatch = savesAfter(MIN_EMAIL_HANDOFF_LENGTH + 500);
    const { publishing } = await confirmSend(inputs);

    await advance(MIN_EMAIL_HANDOFF_LENGTH + 499);
    expect(inputs.onCompleted).not.toHaveBeenCalled();

    await advance(1);
    expect(inputs.onCompleted).toHaveBeenCalledTimes(1);
    await act(() => publishing);
  });

  it('completes nothing when the flow is torn down during the hold', async () => {
    const inputs = options();
    inputs.dispatch = savesAfter(400);
    const { publishing, unmount } = await confirmSend(inputs);
    await advance(800);

    unmount();
    await act(() => publishing);

    expect(inputs.onCompleted).not.toHaveBeenCalled();
    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });

  it('still waits on the email when a failed send is retried', async () => {
    const inputs = options();
    inputs.post = { ...inputs.post, status: 'published', email: FAILED_EMAIL };
    inputs.improveSendingUI = true;
    inputs.onCompleted = vi.fn();
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));

    let retrying: Promise<void> = Promise.resolve();
    act(() => {
      retrying = result.current.retryEmail();
    });
    await waitFor(() => expect(confirmation.settle).toBeDefined());
    expect(inputs.onCompleted).not.toHaveBeenCalled();

    await act(async () => {
      confirmation.settle?.({ kind: 'submitted' });
      await retrying;
    });
    expect(inputs.onCompleted).toHaveBeenCalledWith({
      postId: 'post-1',
      isScheduled: false,
      hasEmail: true,
    });
  });
});

describe('failed newsletter retry', () => {
  it('keeps the last successful eligibility after a background read fails', () => {
    const inputs = options();
    inputs.post = {
      ...inputs.post,
      status: 'published',
      email: {
        id: 'email-1',
        status: 'failed',
        error: 'Sending failed',
        email_count: 20,
        opened_count: 0,
      },
    };
    const { result, rerender } = renderHook(() => usePublishFlow(inputs), { wrapper });
    expect(result.current.canRetryEmail).toBe(true);
    eligibility.isError = true;
    rerender();
    expect(result.current.canRetryEmail).toBe(true);
    expect(result.current.retryEligibilityFailed).toBe(false);
    // The writer never sees this read's error, so it is not reported as shown to them.
    expect(reportPublishFailure).not.toHaveBeenCalledWith(
      'retry-eligibility',
      expect.anything(),
      expect.anything(),
    );
  });
  it.each([null, ''])('keeps a failed retry recoverable with error %j', async (error) => {
    const inputs = options();
    inputs.post = {
      ...inputs.post,
      status: 'published',
      email: {
        id: 'email-1',
        status: 'failed',
        error: 'The email service was unavailable.',
        email_count: 20,
        opened_count: 0,
      },
    };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));

    let retrying: Promise<void> = Promise.resolve();
    act(() => {
      retrying = result.current.retryEmail();
    });

    await act(async () => {
      confirmation.settle?.({ kind: 'failed', error, partial: false });
      await retrying;
    });

    expect(result.current.step).toBe('email-error');
    expect(result.current.emailErrorMessage).toBe('Unknown error');
    expect(result.current.retryStatus).toBe('idle');
  });
});

const FAILED_EMAIL = {
  id: 'email-1',
  status: 'failed' as const,
  error: 'The email service was unavailable.',
  email_count: 20,
  opened_count: 0,
};

/** A flow opened on a published post whose send failed, retrying it. */
async function startRetry(overrides: Partial<PublishFlowOptions> = {}) {
  const inputs = { ...options(), onCompleted: vi.fn(), ...overrides };
  inputs.post = { ...inputs.post, status: 'published', email: FAILED_EMAIL };
  const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
  await waitFor(() => expect(result.current.limitsChecked).toBe(true));

  let retrying: Promise<void> = Promise.resolve();
  act(() => {
    retrying = result.current.retryEmail();
  });
  await waitFor(() => expect(confirmation.fail).toBeDefined());

  return { inputs, result, retrying };
}

describe('a retry Core refuses or cannot answer', () => {
  it('shows the reason Core gave, not the transport’s summary', async () => {
    const { result, retrying } = await startRetry();
    const refusal = new JSONError(
      new Response(null, { status: 400 }),
      {
        errors: [{ message: 'Cannot retry email because the delivery outcome is unknown' }],
      } as ErrorResponse,
      'Something went wrong while loading emails, please try again.',
    );

    await act(async () => {
      confirmation.fail?.(new EmailRetryRequestError(refusal));
      await retrying;
    });

    expect(result.current.retryStatus).toBe('failure');
    expect(result.current.retryFailure).toEqual({
      message: 'Cannot retry email because the delivery outcome is unknown',
    });
    expect(reportPublishFailure).toHaveBeenCalledWith(
      'retry-request',
      'Cannot retry email because the delivery outcome is unknown',
      { error: refusal, postId: 'post-1' },
    );
  });

  it('does not call an accepted retry failed when reading it back fails', async () => {
    const { inputs, result, retrying } = await startRetry();
    const readBack = new Error('Network request failed');

    await act(async () => {
      confirmation.fail?.(readBack);
      await retrying;
    });

    expect(result.current.retryFailure).toBeNull();
    expect(result.current.emailNote).toBe(EMAIL_UNCONFIRMED);
    expect(result.current.step).toBe('complete');
    expect(inputs.onCompleted).toHaveBeenCalledWith({
      postId: 'post-1',
      isScheduled: false,
      hasEmail: true,
    });
    // The note is reported with what stopped the read-back.
    expect(reportPublishFailure).toHaveBeenCalledWith('email-unconfirmed', EMAIL_UNCONFIRMED, {
      error: readBack,
      postId: 'post-1',
    });
  });

  it('refreshes the post reads when an accepted retry cannot be read back', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const inputs = { ...options(), onCompleted: vi.fn() };
    inputs.post = { ...inputs.post, status: 'published', email: FAILED_EMAIL };
    const { result } = renderHook(() => usePublishFlow(inputs), {
      wrapper: ({ children }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));

    let retrying: Promise<void> = Promise.resolve();
    act(() => {
      retrying = result.current.retryEmail();
    });
    await waitFor(() => expect(confirmation.fail).toBeDefined());
    await act(async () => {
      confirmation.fail?.(new Error('Network request failed'));
      await retrying;
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: [postsDataType] });
  });
});

describe('an email the flow could not confirm', () => {
  it('waits for the writer to read the note when the caller hides completion', async () => {
    const { inputs, result, retrying } = await startRetry({ showCompletion: false });

    await act(async () => {
      confirmation.settle?.({ kind: 'timeout' });
      await retrying;
    });

    expect(result.current.step).toBe('complete');
    expect(result.current.emailNote).toBe(EMAIL_UNCONFIRMED);
    expect(result.current.awaitingAcknowledgement).toBe(true);
    expect(inputs.onCompleted).not.toHaveBeenCalled();
    expect(reportPublishFailure).toHaveBeenCalledWith('email-unconfirmed', EMAIL_UNCONFIRMED, {
      postId: 'post-1',
    });

    act(() => result.current.acknowledgeCompletion());

    expect(result.current.awaitingAcknowledgement).toBe(false);
    expect(inputs.onCompleted).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ghost-last-published-post')).not.toBeNull();
  });

  it('hands a confirmed send straight to the caller that hides completion', async () => {
    const { inputs, result, retrying } = await startRetry({ showCompletion: false });

    await act(async () => {
      confirmation.settle?.({ kind: 'submitted' });
      await retrying;
    });

    expect(result.current.awaitingAcknowledgement).toBe(false);
    expect(inputs.onCompleted).toHaveBeenCalledTimes(1);
  });
});

describe('retry eligibility that cannot be read', () => {
  it('says so instead of hiding the retry', () => {
    eligibility.isError = true;
    eligibility.hasData = false;
    const inputs = options();
    inputs.post = { ...inputs.post, status: 'published', email: FAILED_EMAIL };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });

    expect(result.current.canRetryEmail).toBe(false);
    expect(result.current.retryEligibilityFailed).toBe(true);
    expect(reportPublishFailure).toHaveBeenCalledWith(
      'retry-eligibility',
      expect.stringContaining('Could not check'),
      expect.objectContaining({ postId: 'post-1' }),
    );
  });

  it('reloads the post for an email id it does not have', async () => {
    transport.fetchApi.mockResolvedValue({
      posts: [{ id: 'post-1', status: 'published', email: { ...FAILED_EMAIL, id: 'email-9' } }],
    });
    const inputs = options();
    inputs.post = {
      ...inputs.post,
      status: 'published',
      email: { ...FAILED_EMAIL, id: undefined },
    };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });
    expect(result.current.retryEligibilityFailed).toBe(true);

    act(() => result.current.checkRetryEligibility());

    await waitFor(() => expect(result.current.retryEligibilityFailed).toBe(false));
    expect(transport.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining('/posts/post-1/'),
      expect.anything(),
    );
  });
});

describe('a limit that could not be checked', () => {
  it.each([
    ['emails', 'Couldn’t check email limits. Network request failed'],
    ['members', 'Couldn’t check publishing limits. Network request failed'],
  ] as const)('names the %s check and offers it again', async (limit, shown) => {
    const inputs = options();
    const failure = new LimitCheckError(limit, new Error('Network request failed'));
    inputs.limits =
      limit === 'emails'
        ? { checkSendingLimit: () => Promise.reject(failure) }
        : { checkPublishingLimit: () => Promise.reject(failure) };
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });

    await waitFor(() => expect(result.current.limitsFailure).toBe(shown));
    expect(result.current.limitsChecked).toBe(false);
    expect(result.current.state.emailBlock).toBeNull();
    expect(reportPublishFailure).toHaveBeenCalledWith('limit-check', shown, {
      error: failure,
      postId: 'post-1',
    });
  });
});

/** What a request answers once the writer's session is gone. */
function expiredSession() {
  return new UnauthorizedError(new Response(null, { status: 401 }), '');
}

describe('a session that expires outside the publish save', () => {
  it('asks for sign-in when a limit check finds it gone, and checks again once signed in', async () => {
    const inputs = options();
    const checkPublishingLimit = vi
      .fn()
      .mockRejectedValueOnce(new LimitCheckError('members', expiredSession()))
      .mockResolvedValue(undefined);
    inputs.limits = { checkPublishingLimit };
    inputs.requestReauth = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });

    await waitFor(() => expect(result.current.limitsChecked).toBe(true));
    expect(inputs.requestReauth).toHaveBeenCalledTimes(1);
    expect(checkPublishingLimit).toHaveBeenCalledTimes(2);
    expect(result.current.limitsFailure).toBeNull();
  });

  it('says the session expired when sign-in is abandoned, and asks again on Try again', async () => {
    const inputs = options();
    const checkPublishingLimit = vi
      .fn()
      .mockRejectedValue(new LimitCheckError('members', expiredSession()));
    inputs.limits = { checkPublishingLimit };
    inputs.requestReauth = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });

    await waitFor(() =>
      expect(result.current.limitsFailure).toBe(
        'Couldn’t check publishing limits. Your session expired. Try again to sign in.',
      ),
    );
    act(() => result.current.retryLimits());
    await waitFor(() => expect(inputs.requestReauth).toHaveBeenCalledTimes(2));
  });

  it('sends an email retry again once the writer signs in', async () => {
    const requestReauth = vi.fn().mockResolvedValue(true);
    const { inputs, result, retrying } = await startRetry({ requestReauth });
    const firstAttempt = confirmation.fail;

    act(() => {
      confirmation.fail?.(new EmailRetryRequestError(expiredSession()));
    });
    await waitFor(() => expect(confirmation.fail).not.toBe(firstAttempt));
    expect(requestReauth).toHaveBeenCalledTimes(1);
    expect(result.current.retryStatus).toBe('running');

    await act(async () => {
      confirmation.settle?.({ kind: 'submitted' });
      await retrying;
    });
    expect(result.current.retryFailure).toBeNull();
    expect(inputs.onCompleted).toHaveBeenCalledWith({
      postId: 'post-1',
      isScheduled: false,
      hasEmail: true,
    });
  });

  it('says the session expired when sign-in for an email retry is abandoned', async () => {
    const requestReauth = vi.fn().mockResolvedValue(false);
    const { result, retrying } = await startRetry({ requestReauth });

    await act(async () => {
      confirmation.fail?.(new EmailRetryRequestError(expiredSession()));
      await retrying;
    });

    expect(result.current.retryStatus).toBe('failure');
    expect(result.current.retryFailure).toEqual({
      message: 'Your session expired. Try again to sign in.',
    });
  });

  it('fails a limit check that finds the session gone again straight after a sign-in', async () => {
    const inputs = options();
    const checkPublishingLimit = vi
      .fn()
      .mockRejectedValue(new LimitCheckError('members', expiredSession()));
    inputs.limits = { checkPublishingLimit };
    inputs.requestReauth = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => usePublishFlow(inputs), { wrapper });

    await waitFor(() =>
      expect(result.current.limitsFailure).toBe(
        'Couldn’t check publishing limits. Your session expired. Try again to sign in.',
      ),
    );
    // One sign-in, one more check, then the failure: never a loop of sign-in prompts.
    expect(inputs.requestReauth).toHaveBeenCalledTimes(1);
    expect(checkPublishingLimit).toHaveBeenCalledTimes(2);
  });

  it('fails an email retry that finds the session gone again straight after a sign-in', async () => {
    const requestReauth = vi.fn().mockResolvedValue(true);
    const { result, retrying } = await startRetry({ requestReauth });
    const firstAttempt = confirmation.fail;

    act(() => {
      confirmation.fail?.(new EmailRetryRequestError(expiredSession()));
    });
    await waitFor(() => expect(confirmation.fail).not.toBe(firstAttempt));
    await act(async () => {
      confirmation.fail?.(new EmailRetryRequestError(expiredSession()));
      await retrying;
    });

    expect(requestReauth).toHaveBeenCalledTimes(1);
    expect(result.current.retryStatus).toBe('failure');
    expect(result.current.retryFailure).toEqual({
      message: 'Your session expired. Try again to sign in.',
    });
  });

  it('asks for sign-in when reading back an accepted retry finds the session gone', async () => {
    const requestReauth = vi.fn().mockResolvedValue(true);
    const { inputs, result, retrying } = await startRetry({ requestReauth });
    const firstAttempt = confirmation.fail;

    // Core accepted the retry; only the read-back met the expired session.
    act(() => {
      confirmation.fail?.(expiredSession());
    });
    await waitFor(() => expect(confirmation.fail).not.toBe(firstAttempt));
    expect(requestReauth).toHaveBeenCalledTimes(1);

    await act(async () => {
      confirmation.settle?.({ kind: 'submitted' });
      await retrying;
    });
    expect(result.current.emailNote).toBeNull();
    expect(inputs.onCompleted).toHaveBeenCalledWith({
      postId: 'post-1',
      isScheduled: false,
      hasEmail: true,
    });
  });

  it('notes an unconfirmed send without reporting it when sign-in for its read-back is abandoned', async () => {
    const requestReauth = vi.fn().mockResolvedValue(false);
    const { result, retrying } = await startRetry({ requestReauth });
    const expired = expiredSession();

    await act(async () => {
      confirmation.fail?.(expired);
      await retrying;
    });

    expect(requestReauth).toHaveBeenCalledTimes(1);
    expect(result.current.emailNote).toBe(EMAIL_UNCONFIRMED);
    // reportPublishFailure leaves out an expired session itself; the flow passes it the cause.
    expect(reportPublishFailure).toHaveBeenCalledWith('email-unconfirmed', EMAIL_UNCONFIRMED, {
      error: expired,
      postId: 'post-1',
    });
  });

  it('asks for sign-in only once while eligibility reads keep finding the session gone', async () => {
    eligibility.isError = true;
    eligibility.hasData = false;
    eligibility.error = expiredSession();
    const refetch = vi.fn();
    eligibility.refetch = refetch;
    const inputs = { ...options(), requestReauth: vi.fn().mockResolvedValue(false) };
    inputs.post = { ...inputs.post, status: 'published', email: FAILED_EMAIL };
    const { result, rerender } = renderHook(() => usePublishFlow(inputs), { wrapper });
    await waitFor(() => expect(inputs.requestReauth).toHaveBeenCalledTimes(1));

    // A background read fails the same way after the writer abandoned the sign-in.
    eligibility.error = expiredSession();
    rerender();
    expect(inputs.requestReauth).toHaveBeenCalledTimes(1);
    expect(result.current.retryEligibilityFailed).toBe(true);

    // Checking again is the writer's own action, so it asks again.
    act(() => result.current.checkRetryEligibility());
    eligibility.error = expiredSession();
    rerender();
    await waitFor(() => expect(inputs.requestReauth).toHaveBeenCalledTimes(2));
  });

  it('reads the retry eligibility again once the writer signs in', async () => {
    eligibility.isError = true;
    eligibility.hasData = false;
    eligibility.error = expiredSession();
    const refetch = vi.fn();
    eligibility.refetch = refetch;
    const inputs = { ...options(), requestReauth: vi.fn().mockResolvedValue(true) };
    inputs.post = { ...inputs.post, status: 'published', email: FAILED_EMAIL };
    renderHook(() => usePublishFlow(inputs), { wrapper });

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    expect(inputs.requestReauth).toHaveBeenCalledTimes(1);
  });
});
