import { beforeEach, describe, expect, it, vi } from 'vitest';
import { capturedPorts, dispatchedIntents } from '@/editor/session/__test-utils__/save-engine-spy';
import {
  body,
  record,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';
import { META_TITLE_MAX, META_TITLE_TOO_LONG } from './settings-fields';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');

vi.mock('@/editor/engine/save-engine', async (importOriginal) => {
  const spy = await import('@/editor/session/__test-utils__/save-engine-spy');
  return spy.spiedSaveEngine(await importOriginal<SaveEngineModule>());
});

beforeEach(() => {
  dispatchedIntents.length = 0;
  capturedPorts.length = 0;
});

describe('createEditorSession', () => {
  describe('settings fields', () => {
    const PUBLISHED_AT = '2025-12-01T00:00:00.000Z';

    // A field save awaits the slug port and the transport before it lands.
    const settle = () =>
      new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

    it('carries every settings field through the projection into the dirty compare', () => {
      const { session } = sessionHarness({
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
      const { session, state } = sessionHarness({
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
      const { session, state } = sessionHarness({ record: record({ featured: false }) });

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
      const { session } = sessionHarness({ record: record({ featured: false }) });

      session.patchFields({ featured: true });
      session.patchFields({ featured: false });
      session.recordRefetched(record({ featured: true, updated_at: '2026-01-02T00:00:00.000Z' }));

      expect(session.getFields().featured).toBe(true);
      expect(session.isDirty()).toBe(false);
    });

    it('releases a reverted excerpt and omits untouched excerpts from saves', async () => {
      const { session, state } = sessionHarness({ record: record({ custom_excerpt: 'Original' }) });

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
      const built = sessionHarness(
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
      const { session, state } = sessionHarness({ record: record({ tags: [] }) });
      state.acknowledged = record({ tags: [created] });

      session.patchFields({ tags: [{ name: 'Culture' }] });
      await session.dispatchExplicit();

      expect(state.updates[0].payload.tags).toEqual([{ name: 'Culture' }]);
      expect(session.getFields().tags).toEqual([created]);
      expect(session.isDirty()).toBe(false);
    });

    it('compares reverted relations by their editable identity', () => {
      const { session } = sessionHarness({ record: record({ authors: [{ id: 'author-1' }] }) });

      session.patchFields({ authors: [{ id: 'author-2' }] });
      session.patchFields({ authors: [{ id: 'author-1' }] });
      session.recordRefetched(
        record({ authors: [{ id: 'author-3' }], updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(session.getFields().authors).toEqual([{ id: 'author-3' }]);
      expect(session.isDirty()).toBe(false);
    });

    it('keeps an undo made during a save even when its refetch arrives before the acknowledgement', async () => {
      const built = sessionHarness(
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
      const built = sessionHarness(
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
        const built = sessionHarness(
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
      const built = sessionHarness(
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
      const built = sessionHarness(
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
        const built = sessionHarness(
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
      const built = sessionHarness(
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
      const built = sessionHarness(
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
      const built = sessionHarness(
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
      const built = sessionHarness(
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
      const { session } = sessionHarness({
        record: record({ status, published_at: status === 'draft' ? null : PUBLISHED_AT }),
      });

      session.patchFields({ featured: true });
      session.commitField();

      expect(dispatchedIntents).toEqual(dispatches ? ['field'] : []);
    });

    it.each([
      { status: 'draft' as const, persists: true },
      { status: 'published' as const, persists: false },
      { status: 'scheduled' as const, persists: false },
      { status: 'sent' as const, persists: false },
    ])('$status: commitField persists=$persists', async ({ status, persists }) => {
      const { session, state } = sessionHarness({
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
      const { session, state } = sessionHarness({ record: record() });

      session.patchFields({ meta_title: 'a'.repeat(META_TITLE_MAX + 1) });
      session.commitField();
      await settle();

      expect(dispatchedIntents).toEqual([]);
      expect(state.updates).toHaveLength(0);

      expect(await session.dispatchExplicit()).toMatchObject({
        kind: 'failed',
        error: { kind: 'validation', message: META_TITLE_TOO_LONG },
      });
      expect(state.updates).toHaveLength(0);
    });

    // Pins where the refusal lives: the engine only suppresses background saves
    // on a `validation` kind, and only `prepare` can report one before the IO.
    it('refuses the over-long value from the prepare port the session handed the engine', async () => {
      const { session, state } = sessionHarness({ record: record() });

      session.patchFields({ meta_title: 'a'.repeat(META_TITLE_MAX + 1) });
      const snapshot = session.getSaveSnapshot();
      const outcome = await capturedPorts[0].prepare(
        {
          command: { kind: 'explicit', requiresRevision: false, requiresReconfirmation: false },
          snapshot,
          title: snapshot.title,
          slug: snapshot.slug,
          target: { status: snapshot.status, publishedAt: snapshot.publishedAt },
          saveRevision: false,
        },
        new AbortController().signal,
      );

      expect(outcome).toEqual({
        ok: false,
        error: { kind: 'validation', message: META_TITLE_TOO_LONG },
      });
      expect(state.updates).toHaveLength(0);
      expect(state.creates).toHaveLength(0);
    });

    it('stages a field on a published post until an explicit save', async () => {
      const { session, state } = sessionHarness({
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
      const { session, state } = sessionHarness(
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
      const { session } = sessionHarness(
        { record: record({ visibility: 'public' }) },
        { acknowledge: (acknowledged) => ({ ...acknowledged, visibility: 'paid' }) },
      );

      session.patchLexical(body('Changed'));
      await session.dispatchExplicit();

      expect(session.getFields().visibility).toBe('paid');
      expect(session.isDirty()).toBe(false);
    });

    it('keeps a settings field edited while the save was in flight', async () => {
      const built = sessionHarness(
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
      const { session } = sessionHarness({
        record: record({ visibility: 'public', featured: false }),
      });

      const accepted = session.recordRefetched(
        record({ visibility: 'paid', featured: true, updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(accepted).toBe(true);
      expect(session.getFields()).toMatchObject({ visibility: 'paid', featured: true });
      expect(session.isDirty()).toBe(false);
    });

    it('leaves a field it edited alone when a refetch disagrees', () => {
      const { session } = sessionHarness({
        record: record({ visibility: 'public', featured: false }),
      });

      session.patchFields({ featured: true });
      session.recordRefetched(
        record({ visibility: 'paid', featured: false, updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(session.getFields()).toMatchObject({ visibility: 'paid', featured: true });
      expect(session.isDirty()).toBe(true);
    });

    it('leaves a typed excerpt alone when a refetch disagrees', () => {
      const { session } = sessionHarness({ record: record({ custom_excerpt: 'Opened with' }) });

      session.patchExcerpt('typing…');
      session.recordRefetched(
        record({ custom_excerpt: 'From elsewhere', updated_at: '2026-01-02T00:00:00.000Z' }),
      );

      expect(session.getFields().custom_excerpt).toBe('typing…');
    });

    it('discards staged fields when the server copy replaces the document', async () => {
      const { session } = sessionHarness(
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
        const { session, state } = sessionHarness({ currentUserId: 'author-1' });

        expect(session.getFields().authors).toEqual([{ id: 'author-1' }]);
        expect(session.isDirty()).toBe(false);

        session.patchLexical(body('First words'));
        await session.dispatchExplicit();

        expect(state.creates[0].authors).toEqual([{ id: 'author-1' }]);
      });

      it('submits the writer\u2019s authors as identity alone, in their order', async () => {
        const { session, state } = sessionHarness({
          record: record({ authors: [{ id: 'author-1' }] }),
        });

        session.patchFields({ authors: NAMED });

        // The field keeps the whole record so a chip stays named; only the
        // request is reduced to identities.
        expect(session.getFields().authors).toEqual(NAMED);

        await session.dispatchExplicit();

        expect(state.updates[0].payload.authors).toEqual([{ id: 'author-2' }, { id: 'author-1' }]);
      });

      it('refuses a save that would leave the post without an author', async () => {
        const { session, state } = sessionHarness({ record: record({ authors: AUTHORS }) });

        session.patchFields({ authors: [] });
        session.commitField();

        // The gate holds the field save back, as an incomplete tier pairing is.
        expect(dispatchedIntents).toEqual([]);
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
        const built = sessionHarness(
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
});
