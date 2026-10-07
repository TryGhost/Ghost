import { describe, expect, it } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  body,
  LOADED_AT,
  record,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';
import type { EditorRecord } from './projection';

const THEIR_SAVE_AT = '2026-01-02T00:00:00.000Z';

describe('createEditorSession', () => {
  it('adopts a refetched record without re-baselining', () => {
    const { session } = sessionHarness({ record: record() });
    const edited = body('Unsaved edit');

    session.setBaseline(record().lexical);
    session.patchLexical(edited);
    const accepted = session.recordRefetched(record());

    expect(accepted).toBe(true);
    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it('treats a refetched title that differs only by whitespace as unchanged', () => {
    const { session } = sessionHarness({ record: record({ title: 'Hello' }) });
    session.setBaseline(record().lexical);

    session.recordRefetched(record({ title: 'Hello ' }));

    expect(session.getSaveSnapshot()).toMatchObject({
      title: 'Hello',
      isDirty: false,
      titleDirty: false,
    });
  });

  describe('a refetch of a version this session did not load', () => {
    const theirs = () =>
      record({
        title: 'Their title',
        lexical: buildLexicalParagraph('Their words'),
        custom_excerpt: 'Their summary',
        status: 'published',
        published_at: THEIR_SAVE_AT,
        updated_at: THEIR_SAVE_AT,
      });

    it('keeps the loaded token and saved copy under unsaved work, so the next save collides', async () => {
      const { session, state } = sessionHarness(
        { record: record(), baseline: record().lexical },
        { failUpdateWith: updateCollision() },
      );
      session.patchTitle('My title');
      session.patchLexical(body('My words'));

      expect(session.recordRefetched(theirs())).toBe(false);
      expect(session.getSaveSnapshot()).toMatchObject({
        updatedAt: LOADED_AT,
        status: 'draft',
        title: 'My title',
        isDirty: true,
      });
      expect(session.getFields().custom_excerpt).toBeNull();

      await session.dispatchExplicit();

      expect(state.updates[0].payload).toMatchObject({
        updated_at: LOADED_AT,
        title: 'My title',
        status: 'draft',
      });
      expect(session.getState().kind).toBe('conflict');
      expect(session.getFields().title).toBe('My title');
      expect(session.getLiveLexical()).toBe(JSON.stringify(body('My words')));
    });

    it('leaves a clean session clean and unsaved', async () => {
      const { session, state } = sessionHarness({ record: record(), baseline: record().lexical });
      const before = session.getView();

      expect(session.recordRefetched(theirs())).toBe(false);
      await Promise.resolve();

      expect(session.getView()).toBe(before);
      expect(session.getSaveSnapshot()).toMatchObject({
        updatedAt: LOADED_AT,
        status: 'draft',
        isDirty: false,
      });
      expect(session.getView().pendingSave).toBeNull();
      expect(state.updates).toHaveLength(0);
      expect(await session.leaveRequested()).toBe('proceed');
    });

    it('sends the loaded token when the first edit after it saves', async () => {
      const { session, state } = sessionHarness({ record: record(), baseline: record().lexical });

      session.recordRefetched(theirs());
      session.patchLexical(body('My words'));
      await session.dispatchExplicit();

      expect(state.updates[0].payload.updated_at).toBe(LOADED_AT);
    });

    it('sends the token of its own last save rather than the newer one', async () => {
      const { session, state } = sessionHarness({ record: record(), baseline: record().lexical });
      session.patchLexical(body('Saved words'));
      await session.dispatchExplicit();
      const ownSave = state.acknowledged.updated_at;

      expect(session.recordRefetched(theirs())).toBe(false);
      session.patchLexical(body('More words'));
      await session.dispatchExplicit();

      expect(state.updates[1].payload.updated_at).toBe(ownSave);
    });

    it('keeps the saved copy it loaded', () => {
      const { session } = sessionHarness({ record: record(), baseline: record().lexical });
      session.patchTitle('My title');

      session.recordRefetched(theirs());
      session.patchTitle('Hello');

      expect(session.isDirty()).toBe(false);
    });

    it('recognizes a read of its own save once that save has landed', async () => {
      let ownSave: EditorRecord | undefined;
      let adoptedInFlight: boolean | undefined;
      const built = sessionHarness(
        { record: record(), baseline: record().lexical },
        {
          acknowledge: (acknowledged) => {
            ownSave = acknowledged;
            // The read reached the server after the write, and this tab before its answer.
            adoptedInFlight = built.session.recordRefetched(acknowledged);
            return acknowledged;
          },
        },
      );

      built.session.patchLexical(body('Saved words'));
      await built.session.dispatchExplicit();

      expect(adoptedInFlight).toBe(false);
      expect(built.session.getSaveSnapshot().updatedAt).toBe(ownSave?.updated_at);
      expect(built.session.recordRefetched(ownSave!)).toBe(true);
      expect(built.session.isDirty()).toBe(false);
    });
  });

  describe('a read at the held version with another writer’s alt text and caption', () => {
    const mine = () =>
      record({
        feature_image: 'https://example.com/content/images/hills.png',
        feature_image_alt: 'My alt',
        feature_image_caption: 'My caption',
      });
    // Core stores both beside the post, so their edit left the token as it was.
    const theirs = () => ({
      ...mine(),
      feature_image_alt: 'Their alt',
      feature_image_caption: 'Their caption',
    });

    it('adopts both while the writer has not touched them, and sends them on', async () => {
      const { session, state } = sessionHarness({ record: mine(), baseline: mine().lexical });

      expect(session.recordRefetched(theirs())).toBe(true);

      expect(session.getFields()).toMatchObject({
        feature_image_alt: 'Their alt',
        feature_image_caption: 'Their caption',
      });
      expect(session.isDirty()).toBe(false);

      session.patchLexical(body('My words'));
      await session.dispatchExplicit();

      expect(state.updates[0].payload).toMatchObject({
        feature_image_alt: 'Their alt',
        feature_image_caption: 'Their caption',
      });
    });

    it.each([
      { edited: 'feature_image_alt', untouched: 'feature_image_caption' },
      { edited: 'feature_image_caption', untouched: 'feature_image_alt' },
    ] as const)(
      'keeps the $edited the writer edited, and adopts the $untouched',
      async ({ edited, untouched }) => {
        const { session, state } = sessionHarness({ record: mine(), baseline: mine().lexical });
        session.patchFeatureImage({ [edited]: 'Mine, edited' });

        session.recordRefetched(theirs());

        expect(session.getFields()[edited]).toBe('Mine, edited');
        expect(session.getFields()[untouched]).toBe(theirs()[untouched]);

        await session.dispatchExplicit();

        expect(state.updates[0].payload).toMatchObject({
          [edited]: 'Mine, edited',
          [untouched]: theirs()[untouched],
        });
      },
    );
  });

  it.each([
    ['has no collision token', null],
    ['has a malformed collision token', 'not-a-date'],
    ['is older', '2025-12-31T23:59:59.000Z'],
  ])('ignores a refetched record that %s', (_label, updatedAt) => {
    const { session } = sessionHarness({ record: record() });
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

  it('ignores a refetched record while it holds no collision token', () => {
    const { session } = sessionHarness({ record: record({ updated_at: null }) });

    const accepted = session.recordRefetched(record({ status: 'published' }));

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot()).toMatchObject({ status: 'draft', updatedAt: '' });
  });

  it('adopts a read of the held instant written another way, keeping the token as held', async () => {
    const { session, state } = sessionHarness({ record: record(), baseline: record().lexical });

    const accepted = session.recordRefetched(
      record({ status: 'published', updated_at: '2026-01-01T00:00:00Z' }),
    );
    session.patchLexical(body('Edited'));
    await session.dispatchExplicit();

    expect(accepted).toBe(true);
    expect(state.updates[0].payload).toMatchObject({
      status: 'published',
      updated_at: LOADED_AT,
    });
  });

  it('ignores a refetch that lands after the session was disposed', () => {
    const { session } = sessionHarness({ record: record() });
    session.dispose();

    const accepted = session.recordRefetched(record({ status: 'published' }));

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot()).toMatchObject({
      status: 'draft',
      updatedAt: LOADED_AT,
    });
  });

  it('replaces the document when the writer reloads it', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
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

  it('keeps a reload available after a collision retry fails with a transport error', async () => {
    const hooks = { failUpdateWith: updateCollision() as Error };
    const { session } = sessionHarness({ record: record(), baseline: record().lexical }, hooks);
    session.patchTitle('My unsaved title');
    await session.dispatchExplicit();
    hooks.failUpdateWith = new TypeError('Failed to fetch');
    await session.dispatchExplicit();

    expect(session.getView().pendingSave?.blockedBy?.kind).toBe('conflict');
    expect(
      session.recordReloaded(
        record({ title: 'Server title', updated_at: '2026-01-02T00:00:00.000Z' }),
      ),
    ).toBe(true);
    expect(session.getView()).toMatchObject({
      title: 'Server title',
      isDirty: false,
      pendingSave: null,
    });
    session.dispose();
  });

  it('publishes the recovered document before subscribers can edit it', async () => {
    const { session } = sessionHarness(
      { record: record(), baseline: record().lexical },
      { failUpdateWith: updateCollision() },
    );
    session.patchTitle('Unsaved old title');
    await session.dispatchExplicit();
    const reloaded = record({
      title: 'Recovered title',
      slug: 'recovered-title',
      status: 'published',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    let recovered = false;
    session.subscribe(() => {
      if (recovered || session.getState().kind !== 'idle') {
        return;
      }
      recovered = true;
      expect(session.getSaveSnapshot()).toMatchObject({
        title: reloaded.title,
        status: reloaded.status,
        updatedAt: reloaded.updated_at,
      });
      expect(session.getView().pendingSave).toBeNull();
      session.patchTitle('Edited after recovery');
    });

    expect(session.recordReloaded(reloaded)).toBe(true);
    expect(recovered).toBe(true);
    expect(session.getFields().title).toBe('Edited after recovery');
    expect(session.getView().pendingSave).toMatchObject({ blockedBy: null });
    session.dispose();
  });

  it('notifies leave-guard subscribers when a reload clears unsaved work', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
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
    const { session, state } = sessionHarness(
      { record: record() },
      { failUpdateWith: updateCollision() },
    );

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);
    session.patchLexical(body('Written on top of theirs'));
    await session.dispatchExplicit();

    expect(state.updates[1].payload.updated_at).toBe('2026-01-02T00:00:00.000Z');
  });

  it('leaves the conflict state once the document has been reloaded', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.getState().kind).toBe('conflict');

    const accepted = session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(accepted).toBe(true);
    expect(session.getState().kind).toBe('idle');
  });

  it('keeps the conflict while the reload brings back the token the server rejected', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });

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

  it('accepts a reload at the token of a refetch it refused after the rejected save', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
    const newer = record({
      title: 'Their title',
      lexical: buildLexicalParagraph('Their words'),
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.recordRefetched(newer)).toBe(false);
    expect(session.getState().kind).toBe('conflict');

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
    const { session } = sessionHarness({ record: record() });
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
    const { session, state } = sessionHarness(
      { record: record() },
      { failUpdateWith: updateCollision() },
    );

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
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    const before = session.getSaveSnapshot().version;

    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);

    expect(session.getSaveSnapshot().version).toBeGreaterThan(before);
  });

  it('ignores a reload that lands after the session was disposed', () => {
    const { session } = sessionHarness({ record: record() });

    session.dispose();
    session.recordReloaded(record({ title: 'Their title' }));

    expect(session.getSaveSnapshot().title).toBe('Hello');
  });

  it('ignores a reload of a different post', () => {
    const { session } = sessionHarness({ record: record() });

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
});
