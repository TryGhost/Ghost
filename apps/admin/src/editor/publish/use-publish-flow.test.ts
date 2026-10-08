import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MIN_EMAIL_HANDOFF_LENGTH,
  SCHEDULE_PASSED,
  usePublishFlow,
  type PublishFlowOptions,
} from './use-publish-flow';
import type { EmailConfirmationOutcome } from './email-confirmation';
import type { NewsletterInput } from './publish-options';
import type { SaveCompletion } from '@/editor/engine/save-engine';

const transport = vi.hoisted(() => ({ fetchApi: vi.fn(), retryEmail: vi.fn() }));
const eligibility = vi.hoisted(() => ({ isError: false }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFetchApi: () => transport.fetchApi }));
vi.mock('@tryghost/admin-x-framework/api/emails', () => ({
  useEmailSendingStatus: () => ({
    isFetchedAfterMount: true,
    isError: eligibility.isError,
    refetch: vi.fn(),
    data: { email_statuses: [{ sending: { status: 'failed', retryable: true } }] },
  }),
  useRetryEmail: () => ({ mutateAsync: transport.retryEmail }),
}));

// A confirmation each spec settles itself; tearing the flow down settles it as cancelled.
const confirmation = vi.hoisted(() => ({
  settle: undefined as ((outcome: EmailConfirmationOutcome) => void) | undefined,
}));
vi.mock('./email-confirmation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./email-confirmation')>()),
  createEmailConfirmation: () => ({
    retryAndConfirm: () =>
      new Promise<EmailConfirmationOutcome>((resolve) => {
        confirmation.settle = resolve;
      }),
    cancel: () => confirmation.settle?.({ kind: 'cancelled' }),
  }),
}));

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

describe('post reads after a retried send', () => {
  /** Retries a failed send, leaving the flow waiting on its email confirmation. */
  async function retryFailedSend() {
    const client = new QueryClient();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
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
    const { result } = renderHook(() => usePublishFlow(inputs), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children),
    });
    await waitFor(() => expect(result.current.limitsChecked).toBe(true));

    let retrying: Promise<void> = Promise.resolve();
    act(() => {
      retrying = result.current.retryEmail();
    });
    await waitFor(() => expect(confirmation.settle).toBeDefined());

    return { result, invalidateQueries, retrying };
  }

  it.each([
    ['submitted', { kind: 'submitted' }],
    ['failed again', { kind: 'failed', error: null, partial: false }],
  ] as const)('refreshes them once the send has %s', async (_case, outcome) => {
    const { invalidateQueries, retrying } = await retryFailedSend();

    await act(async () => {
      confirmation.settle?.(outcome);
      await retrying;
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['PostsResponseType'] });
  });

  it('leaves them alone when the flow is closed before the send is confirmed', async () => {
    const { result, invalidateQueries, retrying } = await retryFailedSend();

    await act(async () => {
      result.current.cancel();
      await retrying;
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('sends', () => {
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
    // Nothing waits on the send itself; post analytics reports its progress.
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
