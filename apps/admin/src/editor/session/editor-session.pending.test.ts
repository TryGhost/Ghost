import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS } from '@/editor/engine/save-engine';
import { body, record, serializedFields, sessionHarness } from './__test-utils__/session-harness';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('session pending saves', () => {
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
    expect(session.getView().pendingSave).toMatchObject({ reason: 'validation' });
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
    expect(built.session.getView().pendingSave).toMatchObject({ reason: 'field-commit' });
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
