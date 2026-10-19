import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DRAFT_NEWSLETTERS_KEY,
  MAX_DRAFT_NEWSLETTERS,
  draftNewsletterStorage,
  draftNewsletterToStore,
  readDraftNewsletter,
  resolveDraftNewsletter,
  scheduledNewsletterToRestore,
  writeDraftNewsletter,
} from './draft-newsletter';
import { useDraftNewsletter } from './use-draft-newsletter';
import type { NewsletterInput } from './publish-options';

const WEEKLY: NewsletterInput = { slug: 'weekly', status: 'active', sortOrder: 0 };
const MONTHLY: NewsletterInput = { slug: 'monthly', status: 'active', sortOrder: 1 };
const OLD: NewsletterInput = { slug: 'old', status: 'archived', sortOrder: 2 };
const NEWSLETTERS = [MONTHLY, OLD, WEEKLY];

function stored(): Record<string, { slug: string; updatedAt: number }> {
  return JSON.parse(localStorage.getItem(DRAFT_NEWSLETTERS_KEY) ?? '{}') as Record<
    string,
    { slug: string; updatedAt: number }
  >;
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('draftNewsletterStorage', () => {
  it('reaches nothing while the flag is off', () => {
    expect(draftNewsletterStorage(false)).toBeNull();
    expect(draftNewsletterStorage(true)).toBe(window.localStorage);
  });

  it('reaches nothing where storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(draftNewsletterStorage(true)).toBeNull();
  });
});

describe('reading and writing entries', () => {
  it('remembers a newsletter per draft and forgets it', () => {
    writeDraftNewsletter(localStorage, 'post-a', 'monthly', 1);
    writeDraftNewsletter(localStorage, 'post-b', 'weekly', 2);

    expect(readDraftNewsletter(localStorage, 'post-a')).toBe('monthly');
    expect(readDraftNewsletter(localStorage, 'post-b')).toBe('weekly');
    expect(readDraftNewsletter(localStorage, 'post-c')).toBeNull();

    writeDraftNewsletter(localStorage, 'post-a', null);
    expect(readDraftNewsletter(localStorage, 'post-a')).toBeNull();
    expect(stored()).toEqual({ 'post-b': { slug: 'weekly', updatedAt: 2 } });

    writeDraftNewsletter(localStorage, 'post-b', null);
    expect(localStorage.getItem(DRAFT_NEWSLETTERS_KEY)).toBeNull();
  });

  it('keeps the most recently written entries past the cap', () => {
    for (let index = 0; index < MAX_DRAFT_NEWSLETTERS; index += 1) {
      writeDraftNewsletter(localStorage, `post-${index}`, 'monthly', index);
    }
    // Rewriting the oldest entry makes it the newest.
    writeDraftNewsletter(localStorage, 'post-0', 'weekly', 1000);
    writeDraftNewsletter(localStorage, 'post-new', 'monthly', 1001);

    const entries = stored();
    expect(Object.keys(entries)).toHaveLength(MAX_DRAFT_NEWSLETTERS);
    expect(entries['post-0']).toEqual({ slug: 'weekly', updatedAt: 1000 });
    expect(entries['post-new']).toBeDefined();
    expect(entries['post-1']).toBeUndefined();
    expect(entries['post-2']).toBeDefined();
  });

  it.each([
    ['not JSON', '{"post-a":'],
    ['not a map', '["monthly"]'],
    ['null', 'null'],
  ])('reads a corrupt store (%s) as empty and replaces it on write', (_, value) => {
    localStorage.setItem(DRAFT_NEWSLETTERS_KEY, value);

    expect(readDraftNewsletter(localStorage, 'post-a')).toBeNull();
    writeDraftNewsletter(localStorage, 'post-a', 'monthly', 1);
    expect(stored()).toEqual({ 'post-a': { slug: 'monthly', updatedAt: 1 } });
  });

  it('skips malformed entries and keeps the rest', () => {
    localStorage.setItem(
      DRAFT_NEWSLETTERS_KEY,
      JSON.stringify({
        'post-a': { slug: 'monthly', updatedAt: 1 },
        'post-b': { slug: 42, updatedAt: 1 },
        'post-c': 'weekly',
        'post-d': { slug: '', updatedAt: 1 },
      }),
    );

    expect(readDraftNewsletter(localStorage, 'post-a')).toBe('monthly');
    expect(readDraftNewsletter(localStorage, 'post-b')).toBeNull();
    expect(readDraftNewsletter(localStorage, 'post-c')).toBeNull();
    expect(readDraftNewsletter(localStorage, 'post-d')).toBeNull();
  });

  it('does nothing without storage, and survives a store that refuses writes', () => {
    writeDraftNewsletter(null, 'post-a', 'monthly');
    expect(readDraftNewsletter(null, 'post-a')).toBeNull();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(() => writeDraftNewsletter(localStorage, 'post-a', 'monthly')).not.toThrow();
    expect(readDraftNewsletter(localStorage, 'post-a')).toBeNull();
  });
});

describe('draftNewsletterToStore', () => {
  it('stores a newsletter other than the default', () => {
    expect(draftNewsletterToStore('monthly', NEWSLETTERS)).toBe('monthly');
  });

  it('forgets the default, the first active newsletter in Settings order', () => {
    expect(draftNewsletterToStore('weekly', NEWSLETTERS)).toBeNull();
  });
});

describe('resolveDraftNewsletter', () => {
  const draft = { enabled: true, status: 'draft' as const, newsletters: NEWSLETTERS };

  it('starts a draft on its remembered newsletter', () => {
    expect(resolveDraftNewsletter({ ...draft, stored: 'monthly' })).toEqual({
      slug: 'monthly',
      stale: false,
    });
  });

  it('starts a draft without an entry on the default', () => {
    expect(resolveDraftNewsletter({ ...draft, stored: null })).toEqual({
      slug: null,
      stale: false,
    });
  });

  it.each([
    ['archived', 'old'],
    ['deleted', 'gone'],
  ])('drops an entry for a %s newsletter', (_, slug) => {
    expect(resolveDraftNewsletter({ ...draft, stored: slug })).toEqual({
      slug: null,
      stale: true,
    });
  });

  it('judges nothing until the newsletters are known', () => {
    expect(resolveDraftNewsletter({ ...draft, stored: 'old', newsletters: null })).toEqual({
      slug: null,
      stale: false,
    });
  });

  it('ignores entries for posts that are not drafts', () => {
    expect(resolveDraftNewsletter({ ...draft, status: 'scheduled', stored: 'monthly' })).toEqual({
      slug: null,
      stale: false,
    });
  });

  it('ignores entries while the flag is off', () => {
    expect(resolveDraftNewsletter({ ...draft, enabled: false, stored: 'monthly' })).toEqual({
      slug: null,
      stale: false,
    });
  });
});

describe('scheduledNewsletterToRestore', () => {
  it('restores the newsletter a scheduled post had not sent yet', () => {
    expect(
      scheduledNewsletterToRestore({ status: 'scheduled', newsletter: 'monthly', email: null }),
    ).toBe('monthly');
  });

  it.each([
    ['without a newsletter', { status: 'scheduled', newsletter: null, email: null }],
    ['that already has an email', { status: 'scheduled', newsletter: 'monthly', email: {} }],
    ['that is published', { status: 'published', newsletter: 'monthly', email: null }],
  ] as const)('restores nothing for a post %s', (_, post) => {
    expect(scheduledNewsletterToRestore(post)).toBeNull();
  });
});

describe('useDraftNewsletter', () => {
  type HookProps = Parameters<typeof useDraftNewsletter>[0];
  const DRAFT: HookProps = {
    enabled: true,
    postId: 'post-a',
    status: 'draft',
    newsletters: NEWSLETTERS,
  };

  function render(initial: Partial<HookProps> = {}) {
    return renderHook((props: HookProps) => useDraftNewsletter(props), {
      initialProps: { ...DRAFT, ...initial },
    });
  }

  it('remembers a pick, and forgets it when the default is picked', () => {
    const { result } = render();
    expect(result.current.slug).toBeUndefined();

    act(() => result.current.remember('monthly'));
    expect(result.current.slug).toBe('monthly');
    expect(readDraftNewsletter(localStorage, 'post-a')).toBe('monthly');

    act(() => result.current.remember('weekly'));
    expect(result.current.slug).toBeUndefined();
    expect(readDraftNewsletter(localStorage, 'post-a')).toBeNull();
  });

  it('reads and writes nothing while the flag is off, and leaves entries in place', () => {
    writeDraftNewsletter(localStorage, 'post-a', 'monthly', 1);
    const { result } = render({ enabled: false });

    expect(result.current.slug).toBeUndefined();
    act(() => result.current.remember('weekly'));
    act(() => result.current.forget());
    expect(stored()).toEqual({ 'post-a': { slug: 'monthly', updatedAt: 1 } });
  });

  it('reads the entry once the flag resolves on', () => {
    writeDraftNewsletter(localStorage, 'post-a', 'monthly', 1);
    const { result, rerender } = render({ enabled: false });

    rerender(DRAFT);
    expect(result.current.slug).toBe('monthly');
  });

  it('drops an entry for a newsletter that is no longer selectable', () => {
    writeDraftNewsletter(localStorage, 'post-a', 'old', 1);
    const { result } = render();

    expect(result.current.slug).toBeUndefined();
    expect(readDraftNewsletter(localStorage, 'post-a')).toBeNull();
  });

  it('keeps the pick while the newsletters reload', () => {
    writeDraftNewsletter(localStorage, 'post-a', 'monthly', 1);
    const { result, rerender } = render();

    rerender({ ...DRAFT, newsletters: null });
    expect(result.current.slug).toBe('monthly');
  });

  it('forgets the entry in storage without moving the current selection', () => {
    writeDraftNewsletter(localStorage, 'post-a', 'monthly', 1);
    const { result } = render();

    act(() => result.current.forget());
    expect(readDraftNewsletter(localStorage, 'post-a')).toBeNull();
    expect(result.current.slug).toBe('monthly');
  });

  it('holds a pick for the visit where storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const { result } = render();

    act(() => result.current.remember('monthly'));
    expect(result.current.slug).toBe('monthly');
  });
});
