import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DRAFT_NEWSLETTERS_KEY, readDraftNewsletter } from './draft-newsletter';
import { useDraftNewsletter } from './use-draft-newsletter';
import type { NewsletterInput } from './publish-options';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const WEEKLY: NewsletterInput = { slug: 'weekly', status: 'active', sortOrder: 0 };
const MONTHLY: NewsletterInput = { slug: 'monthly', status: 'active', sortOrder: 1 };

const stored = () => readDraftNewsletter(localStorage, 'post-1');

function renderDraftNewsletter(newsletters: ReadonlyArray<NewsletterInput> | null) {
  return renderHook(
    ({ list }) =>
      useDraftNewsletter({ enabled: true, postId: 'post-1', status: 'draft', newsletters: list }),
    { initialProps: { list: newsletters } },
  );
}

describe('useDraftNewsletter', () => {
  it('waits for the newsletter list before judging a pick of the default', () => {
    localStorage.setItem(
      DRAFT_NEWSLETTERS_KEY,
      JSON.stringify({ 'post-1': { slug: 'monthly', updatedAt: 1 } }),
    );
    const { result, rerender } = renderDraftNewsletter(null);

    act(() => result.current.remember('weekly'));
    expect(stored()).toBe('monthly');

    rerender({ list: [WEEKLY, MONTHLY] });
    expect(stored()).toBeNull();
    expect(result.current.slug).toBeUndefined();
  });

  it('stores a pick made before the list loads once it does', () => {
    const { result, rerender } = renderDraftNewsletter(null);

    act(() => result.current.remember('monthly'));
    rerender({ list: [WEEKLY, MONTHLY] });

    expect(stored()).toBe('monthly');
    expect(result.current.slug).toBe('monthly');
  });
});
