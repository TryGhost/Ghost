import { describe, expect, it } from 'vitest';
import { SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  body,
  LOADED_AT,
  record,
  sessionHarness,
} from '@/editor/session/__test-utils__/session-harness';

describe('createEditorSession', () => {
  it('loads a post clean and dirties it on the first edit', () => {
    const { session } = sessionHarness({ record: record() });

    expect(session.getSaveSnapshot().isDirty).toBe(false);

    session.patchLexical(body('Hello and more'));

    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it('submits the edited body and lands the post clean again', async () => {
    const { session, state } = sessionHarness({ record: record() });
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
    const { session, state } = sessionHarness({ record: record() });

    session.patchLexical(body('One'));
    await session.dispatchExplicit();
    session.patchLexical(body('Two'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload.updated_at).toBe(LOADED_AT);
    expect(state.updates[1].payload.updated_at).toBe('2026-01-01T00:00:01.000Z');
  });

  it('creates a new post, adopts its id and updates it afterwards', async () => {
    const { session, state } = sessionHarness();

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
    const { session, state } = sessionHarness({ currentUserId: 'user-1' });

    session.patchLexical(body('First words'));
    await session.dispatchExplicit();
    session.patchLexical(body('More words'));
    await session.dispatchExplicit();

    expect(state.creates[0].authors).toEqual([{ id: 'user-1' }]);
    expect(state.updates[0].payload).not.toHaveProperty('authors');
  });

  it('keeps the excerpt it was given and clears it back to null', async () => {
    const { session, state } = sessionHarness({ record: record() });

    session.patchExcerpt('A summary');
    await session.dispatchExplicit();
    session.patchExcerpt('');
    await session.dispatchExplicit();

    expect(state.updates[0].payload.custom_excerpt).toBe('A summary');
    expect(state.updates[1].payload.custom_excerpt).toBeNull();
  });

  it('adopts a normalized generated slug and keeps following later titles', async () => {
    const { session, state } = sessionHarness(
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
    const { session, state } = sessionHarness(
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
    const { session } = sessionHarness(
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
    const { session, state } = sessionHarness();

    session.setBaseline(null);
    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    expect(state.creates[0]).toMatchObject({ title: '(Untitled)', slug: 'untitled' });
    expect(session.getSaveSnapshot().isDirty).toBe(false);
  });

  it('does not overwrite a title typed while the save was in flight', async () => {
    const built = sessionHarness({}, { duringSave: () => built.session.patchTitle('Typed Later') });
    const { session } = built;

    session.setBaseline(null);
    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    // The request carried the default title, but the writer moved past it.
    expect(built.state.creates[0].title).toBe('(Untitled)');
    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it.each([
    ['only added whitespace', 'Hello ', 'Hello, world', false],
    ['typed more than whitespace', 'Hello!', 'Hello!', true],
  ])(
    'adopts the server title only when the writer %s in flight',
    async (_case, typed, title, isDirty) => {
      const built = sessionHarness(
        { record: record({ title: 'Hello' }) },
        {
          duringSave: () => built.session.patchTitle(typed),
          acknowledge: (next) => ({ ...next, title: 'Hello, world' }),
        },
      );
      const { session } = built;

      session.setBaseline(record().lexical);
      session.patchLexical(body('Edited'));
      await session.dispatchExplicit();

      expect(session.getSaveSnapshot()).toMatchObject({ title, isDirty });
    },
  );

  it('overwrites the input with a server-trimmed title', async () => {
    const { session } = sessionHarness(
      { record: record({ title: 'Hello' }) },
      { acknowledge: (next) => ({ ...next, title: next.title.trim() }) },
    );

    session.setBaseline(record().lexical);
    session.patchTitle('Hello ');
    session.patchLexical(body('Edited'));
    await session.dispatchExplicit();

    expect(session.getSaveSnapshot()).toMatchObject({
      title: 'Hello',
      isDirty: false,
      titleDirty: false,
    });
  });

  it('leaves tags out of the payload so edits elsewhere survive', async () => {
    const { session, state } = sessionHarness({
      record: record({ tags: [{ id: 'tag1', name: 'News' }] }),
    });

    session.patchLexical(body('Edited'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload).not.toHaveProperty('tags');
  });

  it('refuses to update a post it has no collision token for', async () => {
    const { session, state } = sessionHarness({ record: record({ updated_at: null }) });

    session.patchLexical(body('Edited'));
    const completion = await session.dispatchExplicit();

    // Sending no token makes the server skip its collision check, so the save
    // fails instead of overwriting whatever landed meanwhile.
    expect(state.updates).toHaveLength(0);
    expect(completion).toMatchObject({ kind: 'failed', error: { kind: 'unknown' } });
  });

  it('creates a post without a collision token', async () => {
    const { session, state } = sessionHarness();

    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    expect(state.creates).toHaveLength(1);
    expect(state.creates[0]).not.toHaveProperty('updated_at');
  });

  it('does not count adopting the request\u2019s own values as an edit', async () => {
    const { session } = sessionHarness();

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
    const first = sessionHarness();
    const second = sessionHarness();

    first.session.patchLexical(body('Only mine'));

    expect(first.session.getSaveSnapshot().isDirty).toBe(true);
    expect(second.session.getSaveSnapshot().isDirty).toBe(false);
  });

  it('stops saving once disposed', async () => {
    const { session, state } = sessionHarness({ record: record() });

    session.patchLexical(body('Too late'));
    session.dispose();
    await session.dispatchExplicit();

    expect(state.updates).toHaveLength(0);
  });
});
