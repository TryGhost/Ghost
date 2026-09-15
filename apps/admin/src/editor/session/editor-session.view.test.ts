import { describe, expect, it, vi } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';
import { DEFAULT_TITLE } from '@/editor/engine/save-engine';
import { body, record, sessionHarness } from '@/editor/session/__test-utils__/session-harness';

describe('createEditorSession', () => {
  it('notifies subscribers once per dirtiness flip, not once per edit', () => {
    const { session } = sessionHarness({ record: record() });
    session.setBaseline(record().lexical);
    const listener = vi.fn();
    session.subscribe(listener);

    session.patchLexical(body('Hello and more'));
    const dirtyView = session.getView();
    session.patchLexical(body('Hello and more still'));
    session.patchLexical(body('Hello and more still again'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(true);
    expect(session.getView()).toBe(dirtyView);

    session.patchLexical(body('Hello'));

    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.isDirty()).toBe(false);
  });

  it('publishes settings and publish-time edits even while the post stays dirty', () => {
    const { session } = sessionHarness({ record: record({ status: 'published' }) });
    const initial = session.getView();
    expect(session.getView()).toBe(initial);
    const seen: ReturnType<typeof session.getView>[] = [];
    session.subscribe(() => seen.push(session.getView()));

    session.patchFields({ custom_excerpt: 'First summary' });
    session.patchFields({ custom_excerpt: 'Latest summary' });
    session.editPublishedAt('2025-12-01T10:00:00.000Z');
    session.editPublishedAt('2025-12-02T10:00:00.000Z');

    expect(seen).toHaveLength(4);
    expect(seen.every((snapshot) => snapshot.isDirty)).toBe(true);
    expect(seen[0].settings.custom_excerpt).toBe('First summary');
    expect(seen[1].settings.custom_excerpt).toBe('Latest summary');
    expect(seen[2].publishTime.publishedAt).toBe('2025-12-01T10:00:00.000Z');
    expect(seen[3].publishTime.publishedAt).toBe('2025-12-02T10:00:00.000Z');
    expect(seen[3].settings).toBe(seen[1].settings);
    expect(initial.settings.custom_excerpt).toBeNull();
    expect(initial.publishTime.publishedAt).toBeNull();
  });

  it('publishes the title the engine holds, blank or not', () => {
    const { session } = sessionHarness({ record: record() });
    const loaded = session.getView();

    session.patchTitle('Hello again');
    const typed = session.getView();
    session.patchTitle('Hello again');

    expect(loaded.title).toBe('Hello');
    expect(typed.title).toBe('Hello again');
    expect(session.getView()).toBe(typed);

    session.patchTitle('   ');

    expect(session.getView().title).toBe(DEFAULT_TITLE);
  });

  it('publishes an accepted refetch together with retained local settings', () => {
    const { session } = sessionHarness({ record: record({ status: 'published' }) });
    session.patchFields({ meta_title: 'My unsaved search title' });
    const before = session.getView();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(
      session.recordRefetched(
        record({
          status: 'published',
          custom_excerpt: 'Another editor’s summary',
          published_at: '2025-12-01T10:00:00.000Z',
          updated_at: '2026-01-01T00:00:01.000Z',
        }),
      ),
    ).toBe(true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getView()).toMatchObject({
      isDirty: true,
      settings: {
        meta_title: 'My unsaved search title',
        custom_excerpt: 'Another editor’s summary',
      },
      publishTime: { status: 'published', publishedAt: '2025-12-01T10:00:00.000Z' },
    });
    expect(before.settings.custom_excerpt).toBeNull();
  });

  it('keeps unchanged field references through engine transitions', async () => {
    const { session } = sessionHarness({ record: record() });
    const before = session.getView();
    const saving: ReturnType<typeof session.getView>[] = [];
    session.subscribe(() => {
      if (session.getView().state.kind === 'saving') {
        saving.push(session.getView());
      }
    });
    session.patchLexical(body('More words'));
    await session.dispatchExplicit();

    const after = session.getView();
    expect(after.state).toBe(session.getState());
    expect(after.isDirty).toBe(false);
    expect(saving.length).toBeGreaterThan(0);
    expect(saving[0].settings).toBe(before.settings);
    expect(saving[0].publishTime).toBe(before.publishTime);
    expect(after.settings).toEqual(before.settings);
    expect(after.publishTime).toBe(before.publishTime);
    expect(session.getView()).toBe(after);
  });

  it('notifies subscribers when the pending baseline lands and settles the post', () => {
    const { session } = sessionHarness({ record: record() });
    const edited = buildLexicalParagraph('Hello and more');
    session.patchLexical(JSON.parse(edited));
    const listener = vi.fn();
    session.subscribe(listener);

    // Until the hidden editor reports, a diverged body has to be assumed dirty.
    expect(session.isDirty()).toBe(true);

    session.setBaseline(edited);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(false);
  });

  it('reports a throwing subscriber instead of interrupting the edit', () => {
    const onError = vi.fn();
    const { session } = sessionHarness({ record: record(), onError });
    session.setBaseline(record().lexical);
    session.subscribe(() => {
      throw new Error('listener blew up');
    });

    session.patchLexical(body('Hello and more'));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(true);
  });

  it('notifies subscribers when a retry settles what a failed save left dirty', async () => {
    let saveFails = true;
    const { session } = sessionHarness({ record: record() }, { failSave: () => saveFails });
    session.setBaseline(record().lexical);
    session.patchLexical(body('Hello and more'));
    const seen: boolean[] = [];
    session.subscribe(() => seen.push(session.isDirty()));

    await session.dispatchExplicit();

    // A failed save keeps the post dirty and recoverable.
    expect(session.isDirty()).toBe(true);
    expect(seen).toContain(true);

    saveFails = false;
    await session.dispatchExplicit();

    expect(session.isDirty()).toBe(false);
    expect(seen.at(-1)).toBe(false);
  });

  it('stops notifying an unsubscribed listener', () => {
    const { session } = sessionHarness({ record: record() });
    session.setBaseline(record().lexical);
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    session.patchLexical(body('Hello and more'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    session.patchLexical(body('Hello'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(false);
  });
});
