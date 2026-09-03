import { describe, expect, it, vi } from 'vitest';
import { slugify } from '@tryghost/string';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  createEditorSession,
  type EditorSessionOptions,
  type EditorWritePayload,
} from './editor-session';
import type { EditorRecord } from './projection';

const LOADED_AT = '2026-01-01T00:00:00.000Z';

function body(text: string): unknown {
  return JSON.parse(buildLexicalParagraph(text));
}

function record(overrides: Partial<EditorRecord> = {}): EditorRecord {
  return {
    id: 'abc123',
    uuid: 'uuid',
    url: 'https://example.com/hello/',
    title: 'Hello',
    slug: 'hello',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
    ...overrides,
  };
}

interface Harness {
  updates: Array<{ payload: EditorWritePayload; saveRevision?: boolean }>;
  creates: EditorWritePayload[];
  acquiredIds: string[];
  /** The record every acknowledgement answers with; tests advance it. */
  acknowledged: EditorRecord;
}

interface HarnessHooks {
  duringSave?: () => void;
  acknowledge?: (record: EditorRecord, saveCount: number) => EditorRecord;
}

function harness(options: Partial<EditorSessionOptions> = {}, hooks: HarnessHooks = {}) {
  const state: Harness = {
    updates: [],
    creates: [],
    acquiredIds: [],
    acknowledged: record(),
  };
  let saveCount = 0;

  const session = createEditorSession({
    saveFailureMessage: 'Couldn’t save this post.',
    onIdAcquired: (id) => state.acquiredIds.push(id),
    onError: vi.fn(),
    transport: {
      create: (payload) => {
        state.creates.push(payload);
        hooks.duringSave?.();
        saveCount += 1;
        const next = record({
          ...state.acknowledged,
          id: 'created-id',
          title: payload.title as string,
          slug: payload.slug as string,
          lexical: payload.lexical as string,
          updated_at: `2026-01-01T00:00:0${saveCount}.000Z`,
        });
        state.acknowledged = hooks.acknowledge?.(next, saveCount) ?? next;
        return Promise.resolve(state.acknowledged);
      },
      update: (payload, writeOptions) => {
        state.updates.push({ payload, saveRevision: writeOptions.saveRevision });
        hooks.duringSave?.();
        saveCount += 1;
        const next = record({
          ...state.acknowledged,
          title: payload.title as string,
          slug: payload.slug as string,
          lexical: payload.lexical as string,
          custom_excerpt: (payload.custom_excerpt ?? null) as string | null,
          updated_at: `2026-01-01T00:00:0${saveCount}.000Z`,
        });
        state.acknowledged = hooks.acknowledge?.(next, saveCount) ?? next;
        return Promise.resolve(state.acknowledged);
      },
      generateSlug: (text) => Promise.resolve(slugify(text)),
    },
    ...options,
  });

  return { session, state };
}

describe('createEditorSession', () => {
  it('loads a post clean and dirties it on the first edit', () => {
    const { session } = harness({ record: record() });

    expect(session.getSaveSnapshot().isDirty).toBe(false);

    session.patchLexical(body('Hello and more'));

    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it('submits the edited body and lands the post clean again', async () => {
    const { session, state } = harness({ record: record() });
    const edited = body('Hello and more');

    session.setBaseline(record().lexical);
    session.patchLexical(edited);
    await session.dispatchExplicit();

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].payload).toMatchObject({
      id: 'abc123',
      title: 'Hello',
      slug: 'hello',
      lexical: JSON.stringify(edited),
      updated_at: LOADED_AT,
      status: 'draft',
    });
    expect(state.updates[0].saveRevision).toBe(true);
    expect(session.getSaveSnapshot().isDirty).toBe(false);
  });

  it('sends the acknowledged collision token on the next save', async () => {
    const { session, state } = harness({ record: record() });

    session.patchLexical(body('One'));
    await session.dispatchExplicit();
    session.patchLexical(body('Two'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload.updated_at).toBe(LOADED_AT);
    expect(state.updates[1].payload.updated_at).toBe('2026-01-01T00:00:01.000Z');
  });

  it('creates a new post, adopts its id and updates it afterwards', async () => {
    const { session, state } = harness();

    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    expect(state.creates).toHaveLength(1);
    expect(state.creates[0]).not.toHaveProperty('id');
    // A blank title persists as the default and its slug is generated from it.
    expect(state.creates[0]).toMatchObject({ title: '(Untitled)', slug: 'untitled' });
    expect(state.acquiredIds).toEqual(['created-id']);

    session.patchLexical(body('More words'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload).toMatchObject({ id: 'created-id' });
    expect(state.acquiredIds).toEqual(['created-id']);
  });

  it('keeps the excerpt it was given and clears it back to null', async () => {
    const { session, state } = harness({ record: record() });

    session.patchExcerpt('A summary');
    await session.dispatchExplicit();
    session.patchExcerpt('');
    await session.dispatchExplicit();

    expect(state.updates[0].payload.custom_excerpt).toBe('A summary');
    expect(state.updates[1].payload.custom_excerpt).toBeNull();
  });

  it('adopts a normalized generated slug and keeps following later titles', async () => {
    const { session, state } = harness(
      { record: record() },
      {
        acknowledge: (next, saveCount) =>
          saveCount === 1 ? { ...next, slug: 'brand-new-name-2' } : next,
      },
    );

    session.patchTitle('Brand New Name');
    session.commitTitle('Brand New Name');
    await session.dispatchExplicit();

    expect(state.updates[0].payload).toMatchObject({
      title: 'Brand New Name',
      slug: 'brand-new-name',
    });
    expect(session.getSaveSnapshot().isDirty).toBe(false);
    expect(session.getSaveSnapshot().slug).toBe('brand-new-name-2');

    session.patchLexical(body('Edited after acknowledgement'));
    await session.dispatchExplicit();
    expect(state.updates[1].payload.slug).toBe('brand-new-name-2');

    session.patchTitle('Another Name');
    session.commitTitle('Another Name');
    await session.dispatchExplicit();
    expect(state.updates[2].payload.slug).toBe('another-name');
  });

  it('lands clean after a new post is saved under the default title', async () => {
    const { session, state } = harness();

    session.setBaseline(null);
    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    expect(state.creates[0]).toMatchObject({ title: '(Untitled)', slug: 'untitled' });
    expect(session.getSaveSnapshot().isDirty).toBe(false);
  });

  it('does not overwrite a title typed while the save was in flight', async () => {
    const built = harness({}, { duringSave: () => built.session.patchTitle('Typed Later') });
    const { session } = built;

    session.setBaseline(null);
    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    // The request carried the default title, but the writer moved past it.
    expect(built.state.creates[0].title).toBe('(Untitled)');
    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it('leaves tags out of the payload so edits elsewhere survive', async () => {
    const { session, state } = harness({
      record: record({ tags: [{ id: 'tag1', name: 'News' }] }),
    });

    session.patchLexical(body('Edited'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload).not.toHaveProperty('tags');
  });

  it('refuses to update a post it has no collision token for', async () => {
    const { session, state } = harness({ record: record({ updated_at: null }) });

    session.patchLexical(body('Edited'));
    const completion = await session.dispatchExplicit();

    // Sending no token makes the server skip its collision check, so the save
    // fails instead of overwriting whatever landed meanwhile.
    expect(state.updates).toHaveLength(0);
    expect(completion).toMatchObject({ kind: 'failed', error: { kind: 'unknown' } });
  });

  it('creates a post without a collision token', async () => {
    const { session, state } = harness();

    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    expect(state.creates).toHaveLength(1);
    expect(state.creates[0]).not.toHaveProperty('updated_at');
  });

  it('does not count adopting the request\u2019s own values as an edit', async () => {
    const { session } = harness();

    session.setBaseline(null);
    session.patchLexical(body('First words'));
    const before = session.getSaveSnapshot().version;
    await session.dispatchExplicit();

    // The save adopted a default title and a generated slug; neither is an edit.
    expect(session.getSaveSnapshot().version).toBe(before);
    expect(session.getSaveSnapshot().title).toBe('(Untitled)');
    expect(session.getSaveSnapshot().slug).toBe('untitled');

    session.patchTitle('A real title');
    expect(session.getSaveSnapshot().version).toBeGreaterThan(before);
  });

  it('gives each new post its own state', () => {
    const first = harness();
    const second = harness();

    first.session.patchLexical(body('Only mine'));

    expect(first.session.getSaveSnapshot().isDirty).toBe(true);
    expect(second.session.getSaveSnapshot().isDirty).toBe(false);
  });

  it('adopts a refetched record without re-baselining', () => {
    const { session } = harness({ record: record() });
    const edited = body('Unsaved edit');

    session.setBaseline(record().lexical);
    session.patchLexical(edited);
    session.recordRefetched(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it('stops saving once disposed', async () => {
    const { session, state } = harness({ record: record() });

    session.patchLexical(body('Too late'));
    session.dispose();
    await session.dispatchExplicit();

    expect(state.updates).toHaveLength(0);
  });

  it('notifies subscribers once per dirtiness flip, not once per edit', () => {
    const { session } = harness({ record: record() });
    session.setBaseline(record().lexical);
    const listener = vi.fn();
    session.subscribe(listener);

    session.patchLexical(body('Hello and more'));
    session.patchLexical(body('Hello and more still'));
    session.patchLexical(body('Hello and more still again'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(true);

    session.patchLexical(body('Hello'));

    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.isDirty()).toBe(false);
  });

  it('notifies subscribers when the pending baseline lands and settles the post', () => {
    const { session } = harness({ record: record() });
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
    const { session } = harness({ record: record(), onError });
    session.setBaseline(record().lexical);
    session.subscribe(() => {
      throw new Error('listener blew up');
    });

    session.patchLexical(body('Hello and more'));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(true);
  });

  it('stops notifying an unsubscribed listener', () => {
    const { session } = harness({ record: record() });
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
