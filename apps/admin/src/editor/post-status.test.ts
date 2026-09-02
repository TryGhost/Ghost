import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { SaveEngineState } from './engine/save-engine';
import {
  SAVING_MIN_DISPLAY_MS,
  deriveEditorStatus,
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
    expect(
      derive({ status: 'draft' }, { state: { kind: 'conflict', intent: 'autosave', error } }),
    ).toEqual({ kind: 'problem', message: 'Title is too long.' });
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
    });
  });

  it('marks an email-only scheduled post as one that will be sent', () => {
    expect(
      derive({ status: 'scheduled', publishedAt: '2026-09-02T13:00:00.000Z', emailOnly: true }),
    ).toEqual({ kind: 'scheduled', publishedAt: '2026-09-02T13:00:00.000Z', emailOnly: true });
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
