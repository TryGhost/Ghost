import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePublishFlow, type PublishFlowOptions } from './use-publish-flow';
import type { NewsletterInput } from './publish-options';

const transport = vi.hoisted(() => ({ fetchApi: vi.fn(), retryEmail: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFetchApi: () => transport.fetchApi }));
vi.mock('@tryghost/admin-x-framework/api/emails', () => ({
  useRetryEmail: () => ({ mutateAsync: transport.retryEmail }),
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

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('publish option actions', () => {
  it('renders changed options and confirms the same command without a caller refresh', async () => {
    const inputs = options();
    const { result } = renderHook(() => usePublishFlow(inputs));
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
