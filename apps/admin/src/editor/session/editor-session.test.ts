import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { slugify } from '@tryghost/string';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  createEditorSession,
  type EditorSessionOptions,
  type EditorWritePayload,
} from './editor-session';
import type { EditorRecord } from './projection';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');

// A pass-through wrapper. The engine refuses a background save on anything but
// a draft anyway, so `commitField`'s gate is only observable at the dispatch.
const engineSpy = vi.hoisted(() => ({ dispatched: [] as string[] }));

vi.mock('@/editor/engine/save-engine', async (importOriginal) => {
  const actual = await importOriginal<SaveEngineModule>();
  const createSaveEngine = ((ports: never) => {
    const engine = actual.createSaveEngine(ports);
    const dispatch = (kind: string, options?: never) => {
      engineSpy.dispatched.push(kind);
      return engine.dispatch(kind as 'publish', options);
    };
    return { ...engine, dispatch };
  }) as unknown as SaveEngineModule['createSaveEngine'];

  return { ...actual, createSaveEngine };
});

beforeEach(() => {
  engineSpy.dispatched.length = 0;
});

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

function updateCollision(): JSONError {
  return new JSONError(new Response(null, { status: 409 }), {
    errors: [
      {
        code: 'UPDATE_COLLISION',
        context: null,
        details: null,
        ghostErrorCode: null,
        help: '',
        id: 'id',
        message: 'Saving failed! Someone else is editing this post.',
        property: null,
        type: 'UpdateCollisionError',
      },
    ],
  });
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
  /** Answers an update with nothing, which the session reports as a failed save. */
  failSave?: (saveCount: number) => boolean;
  failUpdateWith?: Error;
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
        if (hooks.failUpdateWith) {
          return Promise.reject(hooks.failUpdateWith);
        }
        saveCount += 1;
        if (hooks.failSave?.(saveCount)) {
          return Promise.resolve(undefined);
        }
        const next = record({
          ...state.acknowledged,
          title: payload.title as string,
          slug: payload.slug as string,
          lexical: payload.lexical as string,
          custom_excerpt: ('custom_excerpt' in payload
            ? payload.custom_excerpt
            : (state.acknowledged.custom_excerpt ?? null)) as string | null,
          featured: ('featured' in payload
            ? payload.featured
            : state.acknowledged.featured) as boolean,
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

  it('authors the create with the current user and leaves updates alone', async () => {
    const { session, state } = harness({ currentUserId: 'user-1' });

    session.patchLexical(body('First words'));
    await session.dispatchExplicit();
    session.patchLexical(body('More words'));
    await session.dispatchExplicit();

    expect(state.creates[0].authors).toEqual([{ id: 'user-1' }]);
    expect(state.updates[0].payload).not.toHaveProperty('authors');
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
    const accepted = session.recordRefetched(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(accepted).toBe(true);
    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it.each([
    ['has no collision token', null],
    ['has a malformed collision token', 'not-a-date'],
    ['is older', '2025-12-31T23:59:59.000Z'],
  ])('ignores a refetched record that %s', (_label, updatedAt) => {
    const { session } = harness({ record: record() });
    session.patchTitle('My title');

    const accepted = session.recordRefetched(
      record({ title: 'Stale title', status: 'published', updated_at: updatedAt }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot()).toMatchObject({
      title: 'My title',
      status: 'draft',
      updatedAt: LOADED_AT,
    });
  });

  it('ignores a refetch that lands after the session was disposed', () => {
    const { session } = harness({ record: record() });
    session.dispose();

    const accepted = session.recordRefetched(
      record({ status: 'published', updated_at: '2026-01-02T00:00:00.000Z' }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot()).toMatchObject({
      status: 'draft',
      updatedAt: LOADED_AT,
    });
  });

  it('replaces the document when the writer reloads it', async () => {
    const { session } = harness({ record: record() }, { failUpdateWith: updateCollision() });
    const reloaded = record({
      title: 'Their title',
      lexical: buildLexicalParagraph('Their words'),
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    session.setBaseline(record().lexical);
    session.patchLexical(body('Unsaved edit'));
    await session.dispatchExplicit();
    expect(session.recordReloaded(reloaded)).toBe(true);
    session.setBaseline(reloaded.lexical);

    const snapshot = session.getSaveSnapshot();
    expect(snapshot.isDirty).toBe(false);
    expect(snapshot.title).toBe('Their title');
    expect(snapshot.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(session.getLiveLexical()).toBe(reloaded.lexical);
  });

  it('notifies leave-guard subscribers when a reload clears unsaved work', async () => {
    const { session } = harness({ record: record() }, { failUpdateWith: updateCollision() });
    session.patchTitle('My unsaved title');
    await session.dispatchExplicit();
    expect(session.isDirty()).toBe(true);
    const seen: boolean[] = [];
    session.subscribe(() => seen.push(session.isDirty()));

    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);

    expect(session.isDirty()).toBe(false);
    expect(seen.at(-1)).toBe(false);
    expect(await session.leaveRequested()).toBe('proceed');
  });

  it('sends the reloaded collision token on the next save', async () => {
    const { session, state } = harness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);
    session.patchLexical(body('Written on top of theirs'));
    await session.dispatchExplicit();

    expect(state.updates[1].payload.updated_at).toBe('2026-01-02T00:00:00.000Z');
  });

  it('leaves the conflict state once the document has been reloaded', async () => {
    const { session } = harness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.getState().kind).toBe('conflict');

    const accepted = session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(accepted).toBe(true);
    expect(session.getState().kind).toBe('idle');
  });

  it('keeps the conflict while the reload brings back the token the server rejected', async () => {
    const { session } = harness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();

    const accepted = session.recordReloaded(
      record({
        title: 'Their title',
        lexical: buildLexicalParagraph('Their words'),
        updated_at: LOADED_AT,
      }),
    );

    expect(accepted).toBe(false);
    expect(session.getState().kind).toBe('conflict');
    expect(session.getSaveSnapshot().title).toBe('Hello');
    expect(session.getLiveLexical()).toBe(JSON.stringify(body('Mine')));
  });

  it('accepts a reload at a token a refetch learned after the rejected save', async () => {
    const { session } = harness({ record: record() }, { failUpdateWith: updateCollision() });
    const newer = record({
      title: 'Their title',
      lexical: buildLexicalParagraph('Their words'),
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.recordRefetched(newer)).toBe(true);

    expect(session.recordReloaded(newer)).toBe(true);
    expect(session.getState().kind).toBe('idle');
    expect(session.getSaveSnapshot().title).toBe('Their title');
    expect(session.getLiveLexical()).toBe(newer.lexical);
  });

  it.each([
    ['has no collision token', null],
    ['has a malformed collision token', 'not-a-date'],
    ['is older', '2025-12-31T23:59:59.000Z'],
  ])('keeps local content when the reloaded record %s', (_label, updatedAt) => {
    const { session } = harness({ record: record() });
    session.patchTitle('My title');
    session.patchLexical(body('My words'));

    const accepted = session.recordReloaded(
      record({
        title: 'Their title',
        lexical: buildLexicalParagraph('Their words'),
        updated_at: updatedAt,
      }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot().title).toBe('My title');
    expect(session.getLiveLexical()).toBe(JSON.stringify(body('My words')));
  });

  it('follows the reloaded record when it derives the next slug', async () => {
    const { session, state } = harness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(
      session.recordReloaded(
        record({
          title: 'Their title',
          slug: 'their-slug',
          updated_at: '2026-01-02T00:00:00.000Z',
        }),
      ),
    ).toBe(true);
    session.patchLexical(body('Written on top of theirs'));
    await session.dispatchExplicit();

    // Reloaded title and slug agree, so the save keeps their slug rather than
    // regenerating one from the title this session opened with.
    expect(state.updates[1].payload.slug).toBe('their-slug');
  });

  it('moves the edit version when the document is replaced', async () => {
    const { session } = harness({ record: record() }, { failUpdateWith: updateCollision() });
    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    const before = session.getSaveSnapshot().version;

    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);

    expect(session.getSaveSnapshot().version).toBeGreaterThan(before);
  });

  it('ignores a reload that lands after the session was disposed', () => {
    const { session } = harness({ record: record() });

    session.dispose();
    session.recordReloaded(record({ title: 'Their title' }));

    expect(session.getSaveSnapshot().title).toBe('Hello');
  });

  it('ignores a reload of a different post', () => {
    const { session } = harness({ record: record() });

    const accepted = session.recordReloaded(
      record({
        id: 'someone-else',
        title: 'Not this one',
        updated_at: '2026-01-02T00:00:00.000Z',
      }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot().title).toBe('Hello');
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

  it('notifies subscribers when a retry settles what a failed save left dirty', async () => {
    let saveFails = true;
    const { session } = harness({ record: record() }, { failSave: () => saveFails });
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

  describe('settings fields', () => {
    const PUBLISHED_AT = '2025-12-01T00:00:00.000Z';

    // A field save awaits the slug port and the transport before it lands.
    const settle = () =>
      new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

    it('carries every settings field through the projection into the dirty compare', () => {
      const { session } = harness({
        record: record({
          featured: false,
          visibility: 'public',
          meta_title: 'Meta',
          codeinjection_head: null,
        }),
      });

      expect(session.getFields()).toMatchObject({
        featured: false,
        visibility: 'public',
        meta_title: 'Meta',
        codeinjection_head: null,
      });
      expect(session.isDirty()).toBe(false);

      session.patchFields({ meta_title: 'Different meta' });

      expect(session.isDirty()).toBe(true);
      expect(session.getFields().meta_title).toBe('Different meta');
    });

    it('sends only settings with outstanding edits', async () => {
      const { session, state } = harness({
        record: record({ featured: false, meta_title: 'Untouched', visibility: 'public' }),
      });

      session.patchFields({ featured: true });
      await session.dispatchExplicit();

      expect(state.updates[0].payload).toMatchObject({ featured: true });
      expect(state.updates[0].payload).not.toHaveProperty('meta_title');
      expect(state.updates[0].payload).not.toHaveProperty('visibility');
      expect(session.isDirty()).toBe(false);
    });

    it('adopts remote settings after the local edit was saved without resending it', async () => {
      const { session, state } = harness({ record: record({ featured: false }) });

      session.patchFields({ featured: true });
      await session.dispatchExplicit();
      expect(session.isDirty()).toBe(false);

      state.acknowledged = {
        ...state.acknowledged,
        featured: false,
        updated_at: '2026-01-01T00:00:01.500Z',
      };
      session.recordRefetched(state.acknowledged);

      expect(session.getFields().featured).toBe(false);
      expect(session.isDirty()).toBe(false);

      session.patchTitle('A later title edit');
      await session.dispatchExplicit();
      expect(state.updates[1].payload).not.toHaveProperty('featured');
      expect(state.acknowledged.featured).toBe(false);
    });

    it('releases a Featured edit that was undone before saving', () => {
      const { session } = harness({ record: record({ featured: false }) });

      session.patchFields({ featured: true });
      session.patchFields({ featured: false });
      session.recordRefetched(record({ featured: true, updated_at: '2026-01-02T00:00:00.000Z' }));

      expect(session.getFields().featured).toBe(true);
      expect(session.isDirty()).toBe(false);
    });

    it('releases a reverted excerpt and omits untouched excerpts from saves', async () => {
      const { session, state } = harness({ record: record({ custom_excerpt: 'Original' }) });

      session.patchExcerpt('Temporary');
      session.patchExcerpt('Original');
      state.acknowledged = record({
        custom_excerpt: 'Remote',
        updated_at: '2026-01-01T00:00:00.500Z',
      });
      session.recordRefetched(state.acknowledged);

      expect(session.getFields().custom_excerpt).toBe('Remote');
      expect(session.isDirty()).toBe(false);

      session.patchTitle('A later title edit');
      await session.dispatchExplicit();
      expect(state.updates[0].payload).not.toHaveProperty('custom_excerpt');
      expect(state.acknowledged.custom_excerpt).toBe('Remote');
    });

    it('compares reverted relations by their editable identity', () => {
      const { session } = harness({ record: record({ authors: [{ id: 'author-1' }] }) });

      session.patchFields({ authors: [{ id: 'author-2' }] });
      session.patchFields({ authors: [{ id: 'author-1' }] });
      session.recordRefetched(
        record({ authors: [{ id: 'author-3' }], updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(session.getFields().authors).toEqual([{ id: 'author-3' }]);
      expect(session.isDirty()).toBe(false);
    });

    it('keeps an undo made during a save even when its refetch arrives before the acknowledgement', async () => {
      const built = harness(
        { record: record({ featured: false }) },
        {
          duringSave: () => {
            built.session.patchFields({ featured: false });
            built.session.recordRefetched(
              record({ featured: true, updated_at: '2026-01-01T00:00:01.000Z' }),
            );
          },
        },
      );

      built.session.patchFields({ featured: true });
      await built.session.dispatchExplicit();

      expect(built.session.getFields().featured).toBe(false);
      expect(built.session.isDirty()).toBe(true);

      await built.session.dispatchExplicit();
      expect(built.state.updates[1].payload).toMatchObject({ featured: false });
      expect(built.session.isDirty()).toBe(false);
    });

    // A save hook fires on every request; these cases only describe the first.
    const once = (hook: () => void) => {
      let fired = false;
      return () => {
        if (fired) {
          return;
        }
        fired = true;
        hook();
      };
    };

    it('adopts the last of two refetches that arrive inside one save', async () => {
      const built = harness(
        { record: record({ visibility: 'public' }) },
        {
          duringSave: once(() => {
            built.session.recordRefetched(
              record({ visibility: 'members', updated_at: '2026-01-01T00:00:00.500Z' }),
            );
            built.session.recordRefetched(
              record({ visibility: 'paid', updated_at: '2026-01-01T00:00:00.700Z' }),
            );
          }),
          acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'paid' }),
        },
      );

      built.session.patchLexical(body('Changed'));
      await built.session.dispatchExplicit();

      expect(built.session.getFields().visibility).toBe('paid');
      expect(built.session.isDirty()).toBe(false);

      built.session.patchTitle('A later title edit');
      await built.session.dispatchExplicit();

      expect(built.state.updates[1].payload).not.toHaveProperty('visibility');
    });

    it.each([
      {
        field: 'tags' as const,
        first: [{ id: 'tag-1', name: 'News' }],
        second: [{ id: 'tag-2', name: 'Tech' }],
      },
      {
        field: 'authors' as const,
        first: [{ id: 'author-1' }],
        second: [{ id: 'author-2' }],
      },
    ])(
      'adopts the last of two refetched $field that arrive inside one save',
      async ({ field, first, second }) => {
        const built = harness(
          { record: record({ [field]: [] }) },
          {
            duringSave: once(() => {
              built.session.recordRefetched(
                record({ [field]: first, updated_at: '2026-01-01T00:00:00.500Z' }),
              );
              built.session.recordRefetched(
                record({ [field]: second, updated_at: '2026-01-01T00:00:00.700Z' }),
              );
            }),
            acknowledge: (acknowledged) => ({ ...acknowledged, [field]: second }),
          },
        );

        built.session.patchLexical(body('Changed'));
        await built.session.dispatchExplicit();

        expect(built.session.getFields()[field]).toEqual(second);
        expect(built.session.isDirty()).toBe(false);

        built.session.patchTitle('A later title edit');
        await built.session.dispatchExplicit();

        expect(built.state.updates[1].payload).not.toHaveProperty(field);
      },
    );

    it('lands on the acknowledged value after adopting a refetch inside the save', async () => {
      const built = harness(
        { record: record({ visibility: 'public' }) },
        {
          duringSave: once(() =>
            built.session.recordRefetched(
              record({ visibility: 'paid', updated_at: '2026-01-01T00:00:00.500Z' }),
            ),
          ),
          acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'members' }),
        },
      );

      built.session.patchLexical(body('Changed'));
      await built.session.dispatchExplicit();

      expect(built.session.getFields().visibility).toBe('members');
      expect(built.session.isDirty()).toBe(false);
    });

    it('keeps an edit made after a refetch was adopted inside the same save', async () => {
      const built = harness(
        { record: record({ visibility: 'public' }) },
        {
          duringSave: once(() => {
            built.session.recordRefetched(
              record({ visibility: 'paid', updated_at: '2026-01-01T00:00:00.500Z' }),
            );
            built.session.patchFields({ visibility: 'members' });
          }),
          acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'paid' }),
        },
      );

      built.session.patchLexical(body('Changed'));
      await built.session.dispatchExplicit();

      expect(built.session.getFields().visibility).toBe('members');
      expect(built.session.isDirty()).toBe(true);

      await built.session.dispatchExplicit();

      expect(built.state.updates[1].payload).toMatchObject({ visibility: 'members' });
    });

    it.each([
      { field: 'custom_excerpt' as const, edited: 'Typed while saving', remote: 'Server excerpt' },
      { field: 'visibility' as const, edited: 'members', remote: 'paid' },
      {
        field: 'tags' as const,
        edited: [{ name: 'News' }],
        remote: [{ id: 'tag-2', name: 'Tech' }],
      },
      {
        field: 'authors' as const,
        edited: [{ id: 'author-1' }],
        remote: [{ id: 'author-2' }],
      },
    ])(
      'keeps an unsubmitted $field edit after a matching refetch and persists it next',
      async ({ field, edited, remote }) => {
        const built = harness(
          { record: record() },
          {
            duringSave: once(() => {
              built.session.patchFields({ [field]: edited });
              built.session.recordRefetched(
                record({ [field]: edited, updated_at: '2026-01-01T00:00:00.500Z' }),
              );
            }),
            acknowledge: (acknowledged, count) => ({
              ...acknowledged,
              [field]: count === 1 ? remote : edited,
            }),
          },
        );

        built.session.patchTitle('Changed title');
        await built.session.dispatchExplicit();

        expect(built.state.updates[0].payload).not.toHaveProperty(field);
        expect(built.session.getFields()[field]).toEqual(edited);
        expect(built.session.isDirty()).toBe(true);
        expect(built.session.hasUnsavedContent()).toBe(true);

        await built.session.dispatchExplicit();

        expect(built.state.updates[1].payload).toMatchObject({ [field]: edited });
        expect(built.session.isDirty()).toBe(false);
      },
    );

    it('adopts acknowledged tag metadata when an unsubmitted edit matches the server', async () => {
      const built = harness(
        { record: record() },
        {
          duringSave: once(() => built.session.patchFields({ tags: [{ name: 'News' }] })),
          acknowledge: (acknowledged) => ({
            ...acknowledged,
            tags: [{ id: 'tag-1', name: 'News' }],
          }),
        },
      );

      built.session.patchTitle('Changed title');
      await built.session.dispatchExplicit();

      expect(built.state.updates[0].payload).not.toHaveProperty('tags');
      expect(built.session.getFields().tags).toEqual([{ id: 'tag-1', name: 'News' }]);
      expect(built.session.isDirty()).toBe(false);
    });

    it('adopts a refetch after a settings value was re-emitted unmoved', async () => {
      const built = harness(
        { record: record({ visibility: 'public' }) },
        {
          duringSave: once(() => {
            built.session.patchFields({ visibility: 'public' });
            built.session.recordRefetched(
              record({ visibility: 'paid', updated_at: '2026-01-01T00:00:00.500Z' }),
            );
          }),
          acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'paid' }),
        },
      );

      built.session.patchLexical(body('Changed'));
      await built.session.dispatchExplicit();

      expect(built.session.getFields().visibility).toBe('paid');
      expect(built.session.isDirty()).toBe(false);

      built.session.patchTitle('A later title edit');
      await built.session.dispatchExplicit();

      expect(built.state.updates[1].payload).not.toHaveProperty('visibility');
    });

    it('adopts a refetch after the same tags were re-emitted as a fresh array', async () => {
      const loaded = [{ id: 'tag-1', name: 'News' }];
      const built = harness(
        { record: record({ tags: loaded }) },
        {
          duringSave: once(() => {
            built.session.patchFields({ tags: loaded.map((tag) => ({ ...tag })) });
            built.session.recordRefetched(
              record({
                tags: [{ id: 'tag-2', name: 'Tech' }],
                updated_at: '2026-01-01T00:00:00.500Z',
              }),
            );
          }),
          acknowledge: (acknowledged) => ({
            ...acknowledged,
            tags: [{ id: 'tag-2', name: 'Tech' }],
          }),
        },
      );

      built.session.patchLexical(body('Changed'));
      await built.session.dispatchExplicit();

      expect(built.session.getFields().tags).toEqual([{ id: 'tag-2', name: 'Tech' }]);
      expect(built.session.isDirty()).toBe(false);

      built.session.patchTitle('A later title edit');
      await built.session.dispatchExplicit();

      expect(built.state.updates[1].payload).not.toHaveProperty('tags');
    });

    // The writer moved after the request was built, so only closing the request's
    // window before adopting lets the acknowledged tag ids reach the live document.
    it('adopts the acknowledged tag ids after the writer retyped the same tag mid-save', async () => {
      const built = harness(
        { record: record({ tags: [] }) },
        {
          duringSave: once(() => {
            built.session.patchFields({ tags: [] });
            built.session.patchFields({ tags: [{ name: 'News' }] });
          }),
          acknowledge: (acknowledged) => ({
            ...acknowledged,
            tags: [{ id: 'tag-1', name: 'News' }],
          }),
        },
      );

      built.session.patchFields({ tags: [{ name: 'News' }] });
      await built.session.dispatchExplicit();

      expect(built.state.updates[0].payload).toMatchObject({ tags: [{ name: 'News' }] });
      expect(built.session.getFields().tags).toEqual([{ id: 'tag-1', name: 'News' }]);
      expect(built.session.isDirty()).toBe(false);
    });

    it.each([
      { status: 'draft' as const, dispatches: true },
      { status: 'published' as const, dispatches: false },
      { status: 'scheduled' as const, dispatches: false },
      { status: 'sent' as const, dispatches: false },
    ])('$status: commitField reaches the engine=$dispatches', ({ status, dispatches }) => {
      const { session } = harness({
        record: record({ status, published_at: status === 'draft' ? null : PUBLISHED_AT }),
      });

      session.patchFields({ featured: true });
      session.commitField();

      expect(engineSpy.dispatched).toEqual(dispatches ? ['field'] : []);
    });

    it.each([
      { status: 'draft' as const, persists: true },
      { status: 'published' as const, persists: false },
      { status: 'scheduled' as const, persists: false },
      { status: 'sent' as const, persists: false },
    ])('$status: commitField persists=$persists', async ({ status, persists }) => {
      const { session, state } = harness({
        record: record({
          status,
          published_at: status === 'draft' ? null : PUBLISHED_AT,
        }),
      });

      session.patchFields({ featured: true });
      session.commitField();
      await settle();

      expect(state.updates).toHaveLength(persists ? 1 : 0);
      expect(session.isDirty()).toBe(!persists);
    });

    it('stages a field on a published post until an explicit save', async () => {
      const { session, state } = harness({
        record: record({ status: 'published', published_at: PUBLISHED_AT, featured: false }),
      });

      session.patchFields({ featured: true });
      session.commitField();
      await settle();

      expect(state.updates).toHaveLength(0);
      expect(session.getFields().featured).toBe(true);

      await session.dispatchExplicit();

      expect(state.updates).toHaveLength(1);
      expect(state.updates[0].payload).toMatchObject({ featured: true, status: 'published' });
      expect(session.isDirty()).toBe(false);
    });

    it('keeps a staged field after a rejected save', async () => {
      const { session, state } = harness(
        { record: record({ status: 'published', published_at: PUBLISHED_AT }) },
        { failUpdateWith: updateCollision() },
      );

      session.patchFields({ featured: true });
      await session.dispatchExplicit();

      expect(state.updates).toHaveLength(1);
      expect(session.getFields().featured).toBe(true);
      expect(session.isDirty()).toBe(true);
    });

    it('adopts a settings value the acknowledgement came back with', async () => {
      const { session } = harness(
        { record: record({ visibility: 'public' }) },
        { acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'paid' }) },
      );

      session.patchLexical(body('Changed'));
      await session.dispatchExplicit();

      expect(session.getFields().visibility).toBe('paid');
      expect(session.isDirty()).toBe(false);
    });

    it('keeps a settings field edited while the save was in flight', async () => {
      const built = harness(
        { record: record({ visibility: 'public' }) },
        {
          duringSave: () => built.session.patchFields({ visibility: 'members' }),
          acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'paid' }),
        },
      );

      built.session.patchLexical(body('Changed'));
      await built.session.dispatchExplicit();

      expect(built.session.getFields().visibility).toBe('members');
      expect(built.session.isDirty()).toBe(true);
    });

    it('adopts a refetched settings value it never edited', () => {
      const { session } = harness({ record: record({ visibility: 'public', featured: false }) });

      const accepted = session.recordRefetched(
        record({ visibility: 'paid', featured: true, updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(accepted).toBe(true);
      expect(session.getFields()).toMatchObject({ visibility: 'paid', featured: true });
      expect(session.isDirty()).toBe(false);
    });

    it('leaves a field it edited alone when a refetch disagrees', () => {
      const { session } = harness({ record: record({ visibility: 'public', featured: false }) });

      session.patchFields({ featured: true });
      session.recordRefetched(
        record({ visibility: 'paid', featured: false, updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(session.getFields()).toMatchObject({ visibility: 'paid', featured: true });
      expect(session.isDirty()).toBe(true);
    });

    it('leaves a typed excerpt alone when a refetch disagrees', () => {
      const { session } = harness({ record: record({ custom_excerpt: 'Opened with' }) });

      session.patchExcerpt('typing…');
      session.recordRefetched(
        record({ custom_excerpt: 'From elsewhere', updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(session.getFields().custom_excerpt).toBe('typing…');
    });

    it('discards staged fields when the server copy replaces the document', async () => {
      const { session } = harness(
        { record: record({ status: 'published', published_at: PUBLISHED_AT, featured: false }) },
        { failUpdateWith: updateCollision() },
      );

      session.patchFields({ featured: true });
      await session.dispatchExplicit();

      const reloaded = session.recordReloaded(
        record({
          status: 'published',
          published_at: PUBLISHED_AT,
          featured: false,
          updated_at: '2026-01-02T00:00:00.000Z',
        }),
      );

      expect(reloaded).toBe(true);
      expect(session.getFields().featured).toBe(false);
    });
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
