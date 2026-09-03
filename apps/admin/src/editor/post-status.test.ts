import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { SaveEngineState } from './engine/save-engine';
import {
  MAX_SCHEDULE_TIMEOUT_MS,
  SAVING_MIN_DISPLAY_MS,
  deriveEditorStatus,
  useScheduledBoundary,
  useSavingHold,
  type EditorStatusRecord,
} from './post-status';

const NOW = new Date('2026-09-02T12:00:00.000Z');

const IDLE: SaveEngineState = { kind: 'idle' };

function derive(
  record: EditorStatusRecord | undefined,
  overrides: { state?: SaveEngineState; isDirty?: boolean; isSaving?: boolean } = {},
) {
  return deriveEditorStatus({
    state: overrides.state ?? IDLE,
    record,
    isDirty: overrides.isDirty ?? false,
    isSaving: overrides.isSaving ?? false,
    now: NOW,
  });
}

describe('deriveEditorStatus', () => {
  it('reads a post with no record as new', () => {
    expect(derive(undefined)).toEqual({ kind: 'new' });
  });

  it('separates a dirty draft from a saved one', () => {
    expect(derive({ status: 'draft' }, { isDirty: true })).toEqual({ kind: 'draft', saved: false });
    expect(derive({ status: 'draft' })).toEqual({ kind: 'draft', saved: true });
  });

  it('shows a save in progress only while the post is a draft', () => {
    expect(derive({ status: 'draft' }, { isSaving: true })).toEqual({ kind: 'saving' });
    expect(derive({ status: 'published' }, { isSaving: true }).kind).toBe('published');
  });

  it('carries the engine message for a failed or colliding save', () => {
    const error = { kind: 'validation' as const, message: 'Title is too long.' };

    expect(
      derive({ status: 'draft' }, { state: { kind: 'error', intent: 'field', error } }),
    ).toEqual({ kind: 'problem', message: 'Title is too long.' });
  });

  it('leaves a collision to its own banner', () => {
    const error = { kind: 'conflict' as const, message: 'Someone else is editing this post.' };

    expect(
      derive({ status: 'draft' }, { state: { kind: 'conflict', intent: 'autosave', error } }),
    ).toEqual({ kind: 'draft', saved: true });
  });

  it('prefers the engine message over a save in progress', () => {
    const state: SaveEngineState = {
      kind: 'error',
      intent: 'explicit',
      error: { kind: 'transport', message: 'Couldn’t save this post.' },
    };

    expect(derive({ status: 'draft' }, { state, isSaving: true }).kind).toBe('problem');
  });

  it('reads a scheduled post whose time has passed as published', () => {
    expect(
      derive({ status: 'scheduled', publishedAt: '2026-09-02T11:00:00.000Z', url: 'https://x/y' }),
    ).toEqual({ kind: 'published', url: 'https://x/y', email: 'none', count: 0 });
  });

  it('keeps a scheduled post scheduled until its time arrives', () => {
    expect(derive({ status: 'scheduled', publishedAt: '2026-09-02T13:00:00.000Z' })).toEqual({
      kind: 'scheduled',
      publishedAt: '2026-09-02T13:00:00.000Z',
      emailOnly: false,
      recipientFilter: null,
      recipientSegment: null,
    });
  });

  it('marks an email-only scheduled post as one that will be sent', () => {
    expect(
      derive({ status: 'scheduled', publishedAt: '2026-09-02T13:00:00.000Z', emailOnly: true }),
    ).toMatchObject({ kind: 'scheduled', emailOnly: true });
  });

  it('counts the audience of a scheduled send that has not been handed over', () => {
    expect(
      derive({
        status: 'scheduled',
        publishedAt: '2026-09-02T13:00:00.000Z',
        newsletter: { slug: 'weekly' },
        emailSegment: 'status:free',
      }),
    ).toMatchObject({
      kind: 'scheduled',
      recipientFilter: 'newsletters.slug:weekly+email_disabled:0+(status:free)',
      recipientSegment: 'status:free',
    });
  });

  it('normalizes the persisted all recipient sentinel', () => {
    expect(
      derive({
        status: 'scheduled',
        publishedAt: '2026-09-02T13:00:00.000Z',
        newsletter: { slug: 'weekly' },
        emailSegment: 'all',
      }),
    ).toMatchObject({
      recipientFilter: 'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)',
      recipientSegment: 'status:free,status:-free',
    });
  });

  it('does not count a persisted none recipient sentinel', () => {
    expect(
      derive({
        status: 'scheduled',
        publishedAt: '2026-09-02T13:00:00.000Z',
        newsletter: { slug: 'weekly' },
        emailSegment: 'none',
      }),
    ).toMatchObject({ recipientFilter: null, recipientSegment: null });
  });

  it('scopes a paid-only newsletter to paid members', () => {
    expect(
      derive({
        status: 'scheduled',
        publishedAt: '2026-09-02T13:00:00.000Z',
        newsletter: { slug: 'weekly', visibility: 'paid' },
      }),
    ).toMatchObject({
      recipientFilter: 'newsletters.slug:weekly+email_disabled:0+status:-free',
    });
  });

  it('stops counting once the send has an email record', () => {
    expect(
      derive({
        status: 'scheduled',
        publishedAt: '2026-09-02T13:00:00.000Z',
        newsletter: { slug: 'weekly' },
        hasEmail: true,
      }),
    ).toMatchObject({ recipientFilter: null });
  });

  it('reports the newsletter alongside a published post', () => {
    expect(
      derive({ status: 'published', emailStatus: 'submitting', emailCount: 12 }),
    ).toMatchObject({ kind: 'published', email: 'sending', count: 12 });
    expect(derive({ status: 'published', emailStatus: 'submitted', emailCount: 12 })).toMatchObject(
      {
        email: 'sent',
      },
    );
    expect(derive({ status: 'published', emailStatus: 'failed' })).toMatchObject({
      email: 'failed',
    });
  });

  it('separates a sent post from one whose newsletter failed', () => {
    expect(derive({ status: 'sent', emailCount: 40 })).toEqual({
      kind: 'sent',
      failed: false,
      count: 40,
    });
    expect(derive({ status: 'sent', emailStatus: 'failed', emailCount: 40 })).toEqual({
      kind: 'sent',
      failed: true,
      count: 40,
    });
  });
});

describe('useScheduledBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  function renderScheduledBoundary(publishedAt: string) {
    const record: EditorStatusRecord = { status: 'scheduled', publishedAt };

    return renderHook(() => {
      useScheduledBoundary(publishedAt, true);
      return deriveEditorStatus({
        state: IDLE,
        record,
        isDirty: false,
        isSaving: false,
      });
    });
  }

  it('rerenders when the scheduled time arrives', () => {
    const { result } = renderScheduledBoundary('2026-09-02T12:00:01.000Z');
    expect(result.current.kind).toBe('scheduled');

    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.kind).toBe('published');
  });

  it('reschedules posts beyond the browser timeout limit', () => {
    const publishedAt = new Date(NOW.getTime() + MAX_SCHEDULE_TIMEOUT_MS + 1000).toISOString();
    const { result } = renderScheduledBoundary(publishedAt);

    act(() => void vi.advanceTimersByTime(MAX_SCHEDULE_TIMEOUT_MS));
    expect(result.current.kind).toBe('scheduled');

    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.kind).toBe('published');
  });
});

describe('useSavingHold', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps a save visible for the minimum window after it finishes', () => {
    const { result, rerender } = renderHook(({ saving }) => useSavingHold(saving), {
      initialProps: { saving: true },
    });

    expect(result.current).toBe(true);

    rerender({ saving: false });
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(SAVING_MIN_DISPLAY_MS));
    expect(result.current).toBe(false);
  });

  it('does not extend the window for a save that starts inside it', () => {
    const { result, rerender } = renderHook(({ saving }) => useSavingHold(saving), {
      initialProps: { saving: true },
    });

    act(() => void vi.advanceTimersByTime(SAVING_MIN_DISPLAY_MS - 500));
    rerender({ saving: false });
    rerender({ saving: true });
    rerender({ saving: false });

    act(() => void vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });

  it('opens a new window while the save is still running', () => {
    const { result } = renderHook(() => useSavingHold(true));

    act(() => void vi.advanceTimersByTime(SAVING_MIN_DISPLAY_MS));
    expect(result.current).toBe(true);
  });

  it('stays quiet while nothing is saving', () => {
    const { result } = renderHook(() => useSavingHold(false));

    expect(result.current).toBe(false);
  });
});
