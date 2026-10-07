import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS } from '@/editor/engine/save-engine';
import { body, record, serializedFields, sessionHarness } from './__test-utils__/session-harness';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('session pending saves', () => {
  it('keeps validation visible through unrelated edits and stable while body typing continues', async () => {
    const loaded = record({ authors: [{ id: 'author-1' }] });
    const { session, state } = sessionHarness(
      { record: loaded, baseline: loaded.lexical },
      { applied: serializedFields },
    );
    session.patchFields({ authors: [] });
    session.commitField();
    await vi.advanceTimersByTimeAsync(0);
    const blocker = session.getView().pendingSave?.blockedBy;
    expect(blocker?.kind).toBe('validation');

    session.patchTitle('Unrelated title edit');
    expect(session.getView().pendingSave).toEqual({ blockedBy: blocker });
    session.patchLexical(body('First body edit'));
    session.dispatchAutosave();
    const debouncingView = session.getView();
    expect(debouncingView.pendingSave).toEqual({ blockedBy: blocker });
    const listener = vi.fn();
    session.subscribe(listener);
    session.patchLexical(body('Second body edit'));
    session.dispatchAutosave();
    expect(session.getView()).toBe(debouncingView);
    expect(listener).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);

    session.patchFields({ authors: [{ id: 'author-2' }] });
    expect(session.getView().pendingSave?.blockedBy).toBe(blocker);
    session.commitField();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.updates).toHaveLength(1);
    expect(session.getView().pendingSave).toBeNull();
    session.dispose();
  });

  it('never enters saving for invalid new-post edits', async () => {
    const { session, state } = sessionHarness({ currentUserId: 'author-1' });
    const kinds: string[] = [];
    session.subscribe(() => kinds.push(session.getState().kind));
    session.patchFields({ authors: [] });
    session.patchLexical(body('First words'));
    session.dispatchAutosave();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.getView().pendingSave?.blockedBy?.kind).toBe('validation');

    for (let count = 0; count < 5; count += 1) {
      session.patchLexical(body(`More words ${count}`));
      session.dispatchAutosave();
    }
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    expect(kinds).not.toContain('saving');
    expect(kinds).not.toContain('pending-coalesced');
    expect(state.creates).toHaveLength(0);
    session.dispose();
  });

  it('retires the authors warning when restoring the original authors makes the document clean', async () => {
    const loaded = record({ authors: [{ id: 'author-1' }] });
    const { session, state } = sessionHarness(
      { record: loaded, baseline: loaded.lexical },
      { applied: serializedFields },
    );
    session.patchFields({ authors: [] });
    session.commitField();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.getView().pendingSave?.blockedBy?.kind).toBe('validation');
    session.patchFields({ authors: [{ id: 'author-1' }] });
    session.commitField();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.isDirty()).toBe(false);
    expect(session.getView().pendingSave).toBeNull();
    session.patchTitle('An unrelated title edit');
    expect(session.getView().pendingSave).toEqual({ blockedBy: null });
    expect(state.updates).toHaveLength(0);
    session.dispose();
  });

  it('keeps the saving view stable when later body edits only change the edit version', async () => {
    const loaded = record();
    let before: unknown;
    let after: unknown;
    const listener = vi.fn();
    const { session } = sessionHarness(
      { record: loaded, baseline: loaded.lexical },
      {
        applied: serializedFields,
        duringSave: () => {
          before = session.getView();
          const stop = session.subscribe(listener);
          session.patchLexical(body('Typed during the save'));
          after = session.getView();
          stop();
        },
      },
    );
    session.patchLexical(body('Submitted body'));
    await session.dispatchExplicit();
    expect(after).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(session.getLiveLexical()).toBe(JSON.stringify(body('Typed during the save')));
    expect(session.isDirty()).toBe(true);
    expect(session.getView().pendingSave).toEqual({ blockedBy: null });
    session.dispose();
  });

  it('derives pending work after a failed clean save marks the document dirty', async () => {
    const loaded = record();
    const { session } = sessionHarness(
      { record: loaded, baseline: loaded.lexical },
      { failSave: () => true },
    );
    expect(session.getView().pendingSave).toBeNull();
    await session.dispatchExplicit();
    expect(session.getView()).toMatchObject({
      isDirty: true,
      pendingSave: { blockedBy: { kind: 'unknown' } },
    });
    session.dispose();
  });

  it('combines body, title, image and corrected authors after an armed autosave is blocked', async () => {
    const loaded = record({ authors: [{ id: 'author-1' }] });
    const { session, state } = sessionHarness(
      { record: loaded, baseline: loaded.lexical },
      { applied: serializedFields },
    );
    session.patchLexical(body('New body'));
    session.dispatchAutosave();
    session.patchFields({ authors: [] });
    session.patchTitle('New title');
    session.patchFeatureImage({ feature_image: 'https://example.com/image.png' });
    session.commitField();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

    expect(state.updates).toHaveLength(0);
    expect(session.getState()).toEqual({ kind: 'idle' });
    expect(session.getView().pendingSave).toMatchObject({ blockedBy: { kind: 'validation' } });
    expect(session.hasUnsavedContent()).toBe(true);

    session.patchFields({ authors: [{ id: 'author-2' }] });
    session.commitField();
    await vi.advanceTimersByTimeAsync(0);

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].payload).toMatchObject({
      title: 'New title',
      lexical: JSON.stringify(body('New body')),
      feature_image: 'https://example.com/image.png',
      authors: [{ id: 'author-2' }],
    });
    expect(session.getView().pendingSave).toBeNull();
    expect(session.isDirty()).toBe(false);
    session.dispose();
  });

  it('retains a later feature-image edit after an older request is acknowledged', async () => {
    let first = true;
    const loaded = record({ feature_image: null });
    const built = sessionHarness(
      { record: loaded, baseline: loaded.lexical },
      {
        applied: serializedFields,
        duringSave: () => {
          if (first) {
            first = false;
            built.session.patchFeatureImage({ feature_image: 'https://example.com/later.png' });
          }
        },
      },
    );
    built.session.patchTitle('Renamed');
    await built.session.dispatchExplicit();
    expect(built.state.updates).toHaveLength(1);
    expect(built.state.updates[0].payload.feature_image).toBeNull();
    expect(built.session.getView().pendingSave).toMatchObject({ blockedBy: null });
    expect(built.session.getFields().feature_image).toBe('https://example.com/later.png');

    built.session.commitField();
    await vi.advanceTimersByTimeAsync(0);
    expect(built.state.updates).toHaveLength(2);
    expect(built.state.updates[1].payload).toMatchObject({
      feature_image: 'https://example.com/later.png',
      updated_at: '2026-01-01T00:00:01.000Z',
    });
    expect(built.session.isDirty()).toBe(false);
    expect(built.session.getView().pendingSave).toBeNull();
    built.session.dispose();
  });
});
