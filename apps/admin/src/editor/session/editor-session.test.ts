import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JSONError, SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { slugify } from '@tryghost/string';
import { buildLexicalParagraph } from '@tryghost/test-data';
import { deferred } from '@/utils/deferred';
import {
  createEditorSession,
  type EditorCreatePayload,
  type EditorEditPayload,
  type EditorSessionOptions,
} from './editor-session';
import { META_TITLE_MAX, META_TITLE_TOO_LONG } from './settings-fields';
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
  updates: Array<{ payload: EditorEditPayload; saveRevision?: boolean }>;
  creates: EditorCreatePayload[];
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
  failSlugWith?: Error;
  /** Replaces the generator, so a test can hold a slug request open. */
  generateSlug?: (text: string) => Promise<string>;
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
          title: payload.title,
          slug: payload.slug,
          lexical: payload.lexical,
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
          title: payload.title,
          slug: payload.slug,
          lexical: payload.lexical,
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
      generateSlug: (text) => {
        if (hooks.generateSlug) {
          return hooks.generateSlug(text);
        }
        return hooks.failSlugWith
          ? Promise.reject(hooks.failSlugWith)
          : Promise.resolve(slugify(text));
      },
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

  it('follows the title again once a refused restore is rolled back', async () => {
    const { session, state } = harness(
      { record: record() },
      { failSave: (saveCount) => saveCount === 1 },
    );

    await session.restoreRevision({
      lexical: buildLexicalParagraph('The published words'),
      title: 'Published at last',
      custom_excerpt: null,
      feature_image: null,
      feature_image_alt: null,
      feature_image_caption: null,
    });

    session.patchTitle('Another Name');
    session.commitTitle('Another Name');
    await session.dispatchExplicit();

    // The rollback put the post's own title back beside its slug, so the slug
    // reads derived again and the next typed title regenerates it.
    expect(state.updates[1].payload).toMatchObject({
      title: 'Another Name',
      slug: 'another-name',
    });
  });

  it('rolls back a restore when reauthentication would wait behind the history modal', async () => {
    const { session } = harness(
      { record: record() },
      { failUpdateWith: new SessionExpiredError(new Response(null, { status: 401 }), undefined) },
    );
    const restored = session.restoreRevision({
      lexical: buildLexicalParagraph('Older words'),
      title: 'Older title',
      custom_excerpt: null,
      feature_image: null,
      feature_image_alt: null,
      feature_image_caption: null,
    });
    await expect.poll(() => session.getState().kind).toBe('error');
    expect(await restored).toBe(false);
    expect(session.getFields().title).toBe('Hello');
    expect(session.getLiveLexical()).toBe(record().lexical);
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
    const { session } = harness({ record: record({ status: 'published' }) });
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

  it('publishes an accepted refetch together with retained local settings', () => {
    const { session } = harness({ record: record({ status: 'published' }) });
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
    const { session } = harness({ record: record() });
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

    it('keeps the writer’s tags when a refetch lands mid-save', async () => {
      const chosen = [
        { id: 'tag1', name: 'News' },
        { id: 'tag2', name: 'Sport' },
      ];
      const built = harness(
        { record: record({ tags: [{ id: 'tag1', name: 'News' }] }) },
        {
          duringSave: () => {
            built.session.recordRefetched(
              record({
                tags: [{ id: 'tag3', name: 'Notice' }],
                updated_at: '2026-01-01T00:00:01.000Z',
              }),
            );
          },
        },
      );
      built.state.acknowledged = record({ tags: chosen });

      built.session.patchFields({ tags: chosen });
      await built.session.dispatchExplicit();

      // Identity alone: every other column on a tag belongs to the tag.
      expect(built.state.updates[0].payload.tags).toEqual([{ id: 'tag1' }, { id: 'tag2' }]);
      expect(built.session.getFields().tags).toEqual(chosen);
    });

    it('adopts the id the server gave a tag the writer typed', async () => {
      const created = { id: 'made-1', name: 'Culture', slug: 'culture' };
      const { session, state } = harness({ record: record({ tags: [] }) });
      state.acknowledged = record({ tags: [created] });

      session.patchFields({ tags: [{ name: 'Culture' }] });
      await session.dispatchExplicit();

      expect(state.updates[0].payload.tags).toEqual([{ name: 'Culture' }]);
      expect(session.getFields().tags).toEqual([created]);
      expect(session.isDirty()).toBe(false);
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

    it('refuses a field save and an explicit save on the same over-long value', async () => {
      const { session, state } = harness({ record: record() });

      session.patchFields({ meta_title: 'a'.repeat(META_TITLE_MAX + 1) });
      session.commitField();
      await settle();

      expect(engineSpy.dispatched).toEqual([]);
      expect(state.updates).toHaveLength(0);

      expect(await session.dispatchExplicit()).toMatchObject({
        kind: 'failed',
        error: { kind: 'validation', message: META_TITLE_TOO_LONG },
      });
      expect(state.updates).toHaveLength(0);
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

    describe('authors', () => {
      const AUTHORS = [{ id: 'author-1' }, { id: 'author-2' }];
      const NAMED = [
        { id: 'author-2', name: 'Nadia Ahmed' },
        { id: 'author-1', name: 'Owner User' },
      ];

      it('credits a new post to the current user without dirtying it', async () => {
        const { session, state } = harness({ currentUserId: 'author-1' });

        expect(session.getFields().authors).toEqual([{ id: 'author-1' }]);
        expect(session.isDirty()).toBe(false);

        session.patchLexical(body('First words'));
        await session.dispatchExplicit();

        expect(state.creates[0].authors).toEqual([{ id: 'author-1' }]);
      });

      it('submits the writer\u2019s authors as identity alone, in their order', async () => {
        const { session, state } = harness({ record: record({ authors: [{ id: 'author-1' }] }) });

        session.patchFields({ authors: NAMED });

        // The field keeps the whole record so a chip stays named; only the
        // request is reduced to identities.
        expect(session.getFields().authors).toEqual(NAMED);

        await session.dispatchExplicit();

        expect(state.updates[0].payload.authors).toEqual([{ id: 'author-2' }, { id: 'author-1' }]);
      });

      it('refuses a save that would leave the post without an author', async () => {
        const { session, state } = harness({ record: record({ authors: AUTHORS }) });

        session.patchFields({ authors: [] });
        session.commitField();

        // The gate holds the field save back, as an incomplete tier pairing is.
        expect(engineSpy.dispatched).toEqual([]);
        expect(await session.dispatchExplicit()).toMatchObject({
          kind: 'failed',
          error: { kind: 'validation', message: 'At least one author is required.' },
        });
        expect(state.updates).toHaveLength(0);
        expect(session.hasUnsavedContent()).toBe(true);

        session.patchFields({ authors: [AUTHORS[1]] });

        expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
        expect(state.updates[0].payload.authors).toEqual([{ id: 'author-2' }]);
      });

      it('keeps an author the writer dropped while a save was in flight', async () => {
        const built = harness(
          { record: record({ authors: AUTHORS }) },
          {
            duringSave: once(() => {
              built.session.patchFields({ authors: [AUTHORS[0]] });
              // The server has not seen the removal yet, so its copy still has both.
              built.session.recordRefetched(
                record({ authors: AUTHORS, updated_at: '2026-01-01T00:00:00.500Z' }),
              );
            }),
            acknowledge: (acknowledged) => ({ ...acknowledged, authors: AUTHORS }),
          },
        );

        built.session.patchLexical(body('Changed'));
        await built.session.dispatchExplicit();

        expect(built.state.updates[0].payload).not.toHaveProperty('authors');
        expect(built.session.getFields().authors).toEqual([AUTHORS[0]]);
        expect(built.session.isDirty()).toBe(true);

        await built.session.dispatchExplicit();

        expect(built.state.updates[1].payload.authors).toEqual([AUTHORS[0]]);
        expect(built.session.isDirty()).toBe(false);
      });
    });
  });

  describe('slug', () => {
    const PUBLISHED_AT = '2025-12-01T00:00:00.000Z';

    // A slug edit awaits the generator, and the field save it triggers the transport.
    const settle = () =>
      new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

    it.each(['published', 'scheduled', 'sent'] as const)(
      'waits for a pending manual slug before explicitly saving a %s post',
      async (status) => {
        const generated = deferred<string>();
        const { session, state } = harness(
          { record: record({ status, published_at: PUBLISHED_AT }) },
          { generateSlug: () => generated.promise },
        );

        const edit = session.editSlug('A New Slug');
        const save = session.dispatchExplicit();
        await settle();
        expect(state.updates).toHaveLength(0);

        generated.resolve('a-new-slug');
        await edit;
        expect(await save).toMatchObject({ kind: 'saved' });
        expect(state.updates).toHaveLength(1);
        expect(state.updates[0].payload).toMatchObject({ slug: 'a-new-slug', status });
        expect(session.isDirty()).toBe(false);
      },
    );

    it('releases the barrier when a restore lands on a pending manual edit', async () => {
      const held = deferred<string>();
      let requests = 0;
      const { session, state } = harness(
        { record: record() },
        {
          generateSlug: (text) => {
            requests += 1;
            return requests === 1 ? held.promise : Promise.resolve(slugify(text));
          },
        },
      );

      const edit = session.editSlug('A New Slug');
      const restored = await session.restoreRevision({
        lexical: buildLexicalParagraph('The published words'),
        title: 'Published at last',
        custom_excerpt: null,
        feature_image: null,
        feature_image_alt: null,
        feature_image_caption: null,
      });

      // The restore is a document boundary, so it did not wait on the edit and
      // saved the slug the post still holds.
      expect(restored).toBe(true);
      expect(state.updates[0].payload).toMatchObject({
        title: 'Published at last',
        slug: 'hello',
      });

      expect(await edit).toBe('unchanged');
      expect(session.isDirty()).toBe(false);

      // Nothing is stuck behind the released barrier: a later edit still applies.
      expect(await session.editSlug('Another Slug')).toBe('applied');
      held.resolve('a-new-slug');
      await settle();
      expect(session.getSlug()).toBe('another-slug');
      expect(state.updates[1].payload).toMatchObject({ slug: 'another-slug' });
    });

    it('protects a draft while its manual slug is generated and saves it before leaving', async () => {
      const generated = deferred<string>();
      const { session, state } = harness(
        { record: record() },
        { generateSlug: () => generated.promise },
      );
      const listener = vi.fn();
      session.subscribe(listener);

      const edit = session.editSlug('A New Slug');
      expect(session.isDirty()).toBe(true);
      expect(session.hasUnsavedContent()).toBe(true);
      expect(listener).toHaveBeenCalled();
      let left = false;
      const leave = session.leaveRequested().then((decision) => {
        left = true;
        return decision;
      });
      await settle();
      expect(left).toBe(false);
      expect(state.updates).toHaveLength(0);

      generated.resolve('a-new-slug');
      await edit;
      expect(await leave).toBe('proceed');
      expect(state.updates).toHaveLength(1);
      expect(state.updates[0].payload).toMatchObject({ slug: 'a-new-slug' });
      expect(session.isDirty()).toBe(false);
    });

    it.each(['published', 'scheduled', 'sent'] as const)(
      'asks before abandoning a pending manual slug on a %s post',
      async (status) => {
        const generated = deferred<string>();
        const { session, state } = harness(
          { record: record({ status, published_at: PUBLISHED_AT }) },
          { generateSlug: () => generated.promise },
        );

        const edit = session.editSlug('A New Slug');
        expect(session.isDirty()).toBe(true);
        expect(await session.leaveRequested()).toBe('confirm');
        session.dispose();
        const listener = vi.fn();
        session.subscribe(listener);
        generated.resolve('a-new-slug');
        expect(await edit).toBe('unchanged');
        expect(state.updates).toHaveLength(0);
        expect(session.getFields().slug).toBe('hello');
        expect(listener).not.toHaveBeenCalled();
      },
    );

    it('takes a draft’s manual edit custom and persists it on its own', async () => {
      const { session, state } = harness({ record: record() });

      await session.editSlug('A New Slug');
      await settle();

      expect(session.getSlug()).toBe('a-new-slug');
      expect(session.getSaveSnapshot().slugIsCustom).toBe(true);
      expect(engineSpy.dispatched).toEqual(['field']);
      expect(state.updates).toHaveLength(1);
      expect(state.updates[0].payload).toMatchObject({ slug: 'a-new-slug' });
      expect(session.isDirty()).toBe(false);
    });

    it('stages a published post’s manual edit until an explicit save', async () => {
      const { session, state } = harness({
        record: record({ status: 'published', published_at: PUBLISHED_AT }),
      });

      await session.editSlug('A New Slug');
      await settle();

      expect(engineSpy.dispatched).toEqual([]);
      expect(state.updates).toHaveLength(0);
      expect(session.getSlug()).toBe('a-new-slug');
      expect(session.isDirty()).toBe(true);

      await session.dispatchExplicit();

      expect(state.updates[0].payload).toMatchObject({ slug: 'a-new-slug', status: 'published' });
      expect(session.isDirty()).toBe(false);
    });

    it('keeps a manually edited slug through a later title commit', async () => {
      const { session } = harness({ record: record() });

      await session.editSlug('A New Slug');
      session.patchTitle('Something else entirely');
      session.commitTitle('Something else entirely');
      await settle();

      expect(session.getSlug()).toBe('a-new-slug');
    });

    it('leaves an edit that matches the current slug alone', async () => {
      const { session, state } = harness({ record: record() });

      await session.editSlug('hello');
      await settle();

      expect(session.getSlug()).toBe('hello');
      expect(session.getSaveSnapshot().slugIsCustom).toBe(false);
      expect(engineSpy.dispatched).toEqual([]);
      expect(state.updates).toHaveLength(0);
    });

    it('keeps the slug and reports the error when the generator fails', async () => {
      const errors: unknown[] = [];
      const failure = new Error('Slug generation failed');
      const { session, state } = harness(
        { record: record(), onError: (error) => errors.push(error) },
        { failSlugWith: failure },
      );

      const outcome = await session.editSlug('A New Slug');
      await settle();

      expect(outcome).toBe('failed');
      expect(session.getSlug()).toBe('hello');
      expect(engineSpy.dispatched).toEqual([]);
      expect(state.updates).toHaveLength(0);
      expect(errors).toEqual([failure]);
      expect(session.isDirty()).toBe(false);
      expect(session.hasUnsavedContent()).toBe(false);
    });

    it('keeps the slug and reports a failure when the generator answers blank', async () => {
      const errors: unknown[] = [];
      const { session, state } = harness(
        { record: record(), onError: (error) => errors.push(error) },
        { generateSlug: () => Promise.resolve('   ') },
      );

      const outcome = await session.editSlug('A New Slug');
      await settle();

      expect(outcome).toBe('failed');
      expect(session.getSlug()).toBe('hello');
      expect(engineSpy.dispatched).toEqual([]);
      expect(state.updates).toHaveLength(0);
      expect(errors).toEqual([]);
      expect(session.isDirty()).toBe(false);
    });

    it('drops an edit a reload superseded rather than writing it onto the new document', async () => {
      let answerGenerator: (slug: string) => void = () => {};
      const { session, state } = harness(
        { record: record() },
        {
          failUpdateWith: updateCollision(),
          generateSlug: () =>
            new Promise<string>((resolve) => {
              answerGenerator = resolve;
            }),
        },
      );

      // A reload is only accepted out of a conflict, so the save has to fail first.
      session.patchLexical(body('Mine'));
      await session.dispatchExplicit();
      engineSpy.dispatched.length = 0;

      const edit = session.editSlug('A New Slug');
      expect(
        session.recordReloaded(
          record({
            title: 'Their title',
            slug: 'their-slug',
            updated_at: '2026-01-02T00:00:00.000Z',
          }),
        ),
      ).toBe(true);
      expect(session.isDirty()).toBe(false);
      expect(session.hasUnsavedContent()).toBe(false);
      answerGenerator('a-new-slug');

      const outcome = await edit;
      await settle();

      expect(session.getFields().slug).toBe('their-slug');
      expect(session.getSlug()).toBe('their-slug');
      expect(engineSpy.dispatched).toEqual([]);
      expect(state.updates).toHaveLength(1);
      expect(outcome).toBe('unchanged');
    });

    it('can save the reloaded document before an obsolete slug request answers', async () => {
      const generated = deferred<string>();
      const hooks: HarnessHooks = {
        failUpdateWith: updateCollision(),
        generateSlug: () => generated.promise,
      };
      const { session, state } = harness(
        { record: record({ status: 'published', published_at: PUBLISHED_AT }) },
        hooks,
      );
      await session.dispatchExplicit();
      const edit = session.editSlug('Obsolete');
      const reloaded = record({
        status: 'published',
        published_at: PUBLISHED_AT,
        slug: 'their-slug',
        updated_at: '2026-01-02T00:00:00.000Z',
      });
      expect(session.recordReloaded(reloaded)).toBe(true);
      hooks.failUpdateWith = undefined;
      state.acknowledged = reloaded;

      const save = session.dispatchExplicit();
      await settle();
      expect(state.updates).toHaveLength(2);
      expect(state.updates[1].payload).toMatchObject({ slug: 'their-slug' });
      expect(await save).toMatchObject({ kind: 'saved' });

      generated.resolve('obsolete');
      expect(await edit).toBe('unchanged');
      expect(session.getSlug()).toBe('their-slug');
      expect(session.isDirty()).toBe(false);
    });

    it('releases a save and leave waiting on a slug when the session is disposed', async () => {
      const generated = deferred<string>();
      const { session, state } = harness(
        { record: record() },
        { generateSlug: () => generated.promise },
      );
      const edit = session.editSlug('A New Slug');
      const save = session.dispatchExplicit();
      const leave = session.leaveRequested();
      await settle();

      session.dispose();
      expect(await save).toMatchObject({ kind: 'dropped', reason: 'disposed' });
      expect(await leave).toBe('proceed');
      generated.resolve('a-new-slug');
      expect(await edit).toBe('unchanged');
      expect(state.updates).toHaveLength(0);
    });

    it('notifies subscribers when a title commit regenerates the slug', async () => {
      const { session } = harness({ record: record() });
      const listener = vi.fn();
      session.subscribe(listener);

      session.commitTitle('Second title');
      await settle();

      expect(session.getSlug()).toBe('second-title');
      expect(listener).toHaveBeenCalled();
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

describe('write payload', () => {
  it('refuses a key the write contract does not carry', () => {
    const payload: EditorCreatePayload = {
      title: 'Hello',
      // @ts-expect-error a misspelled field is not part of the write contract
      custom_excerptt: 'A summary',
    };

    expect(payload.title).toBe('Hello');
  });

  it('refuses a value the field does not hold', () => {
    const payload: EditorCreatePayload = {
      title: 'Hello',
      // @ts-expect-error `featured` is a boolean
      featured: 'yes',
    };

    expect(payload.title).toBe('Hello');
  });

  it('carries the identity an update needs', () => {
    const payload: EditorEditPayload = {
      title: 'Hello',
      id: 'abc123',
      updated_at: LOADED_AT,
    };

    expect(payload).toMatchObject({ id: 'abc123', updated_at: LOADED_AT });
  });

  it('requires both the id and collision token for an update', () => {
    // @ts-expect-error an update must identify the post
    const withoutId: EditorEditPayload = { title: 'Hello', updated_at: LOADED_AT };
    // @ts-expect-error an update must carry its collision token
    const withoutToken: EditorEditPayload = { title: 'Hello', id: 'abc123' };
    const nullToken: EditorEditPayload = {
      title: 'Hello',
      id: 'abc123',
      // @ts-expect-error null would bypass the server's collision check
      updated_at: null,
    };

    expect(withoutId.id).toBeUndefined();
    expect(withoutToken.updated_at).toBeUndefined();
    expect(nullToken.updated_at).toBeNull();
  });
});
