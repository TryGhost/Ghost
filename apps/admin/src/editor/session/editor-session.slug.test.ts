import { beforeEach, describe, expect, it, vi } from 'vitest';
import { slugify } from '@tryghost/string';
import { buildLexicalParagraph } from '@tryghost/test-data';
import { deferred } from '@/utils/deferred';
import { dispatchedIntents } from '@/editor/session/__test-utils__/save-engine-spy';
import {
  body,
  type HarnessHooks,
  record,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');

vi.mock('@/editor/engine/save-engine', async (importOriginal) => {
  const spy = await import('@/editor/session/__test-utils__/save-engine-spy');
  return spy.spiedSaveEngine(await importOriginal<SaveEngineModule>());
});

beforeEach(() => {
  dispatchedIntents.length = 0;
});

describe('createEditorSession', () => {
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
        const { session, state } = sessionHarness(
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
      const { session, state } = sessionHarness(
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
      const { session, state } = sessionHarness(
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
        const { session, state } = sessionHarness(
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
      const { session, state } = sessionHarness({ record: record() });

      await session.editSlug('A New Slug');
      await settle();

      expect(session.getSlug()).toBe('a-new-slug');
      expect(session.getSaveSnapshot().slugIsCustom).toBe(true);
      expect(dispatchedIntents).toEqual(['field']);
      expect(state.updates).toHaveLength(1);
      expect(state.updates[0].payload).toMatchObject({ slug: 'a-new-slug' });
      expect(session.isDirty()).toBe(false);
    });

    it('stages a published post’s manual edit until an explicit save', async () => {
      const { session, state } = sessionHarness({
        record: record({ status: 'published', published_at: PUBLISHED_AT }),
      });

      await session.editSlug('A New Slug');
      await settle();

      expect(session.getView().pendingSave).toMatchObject({ blockedBy: null });
      expect(state.updates).toHaveLength(0);
      expect(session.getSlug()).toBe('a-new-slug');
      expect(session.isDirty()).toBe(true);

      await session.dispatchExplicit();

      expect(state.updates[0].payload).toMatchObject({ slug: 'a-new-slug', status: 'published' });
      expect(session.isDirty()).toBe(false);
    });

    it('keeps a manually edited slug through a later title commit', async () => {
      const { session } = sessionHarness({ record: record() });

      await session.editSlug('A New Slug');
      session.patchTitle('Something else entirely');
      session.commitTitle('Something else entirely');
      await settle();

      expect(session.getSlug()).toBe('a-new-slug');
    });

    it('leaves an edit that matches the current slug alone', async () => {
      const { session, state } = sessionHarness({ record: record() });

      await session.editSlug('hello');
      await settle();

      expect(session.getSlug()).toBe('hello');
      expect(session.getSaveSnapshot().slugIsCustom).toBe(false);
      expect(dispatchedIntents).toEqual([]);
      expect(state.updates).toHaveLength(0);
    });

    it('keeps the slug and reports the error when the generator fails', async () => {
      const errors: unknown[] = [];
      const failure = new Error('Slug generation failed');
      const { session, state } = sessionHarness(
        { record: record(), onError: (error) => errors.push(error) },
        { failSlugWith: failure },
      );

      const outcome = await session.editSlug('A New Slug');
      await settle();

      expect(outcome).toBe('failed');
      expect(session.getSlug()).toBe('hello');
      expect(dispatchedIntents).toEqual([]);
      expect(state.updates).toHaveLength(0);
      expect(errors).toEqual([failure]);
      expect(session.isDirty()).toBe(false);
      expect(session.hasUnsavedContent()).toBe(false);
    });

    it('keeps the slug and reports a failure when the generator answers blank', async () => {
      const errors: unknown[] = [];
      const { session, state } = sessionHarness(
        { record: record(), onError: (error) => errors.push(error) },
        { generateSlug: () => Promise.resolve('   ') },
      );

      const outcome = await session.editSlug('A New Slug');
      await settle();

      expect(outcome).toBe('failed');
      expect(session.getSlug()).toBe('hello');
      expect(dispatchedIntents).toEqual([]);
      expect(state.updates).toHaveLength(0);
      expect(errors).toEqual([]);
      expect(session.isDirty()).toBe(false);
    });

    it('drops an edit a reload superseded rather than writing it onto the new document', async () => {
      let answerGenerator: (slug: string) => void = () => {};
      const { session, state } = sessionHarness(
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
      dispatchedIntents.length = 0;

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
      expect(dispatchedIntents).toEqual([]);
      expect(state.updates).toHaveLength(1);
      expect(outcome).toBe('unchanged');
    });

    it('can save the reloaded document before an obsolete slug request answers', async () => {
      const generated = deferred<string>();
      const hooks: HarnessHooks = {
        failUpdateWith: updateCollision(),
        generateSlug: () => generated.promise,
      };
      const { session, state } = sessionHarness(
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
      const { session, state } = sessionHarness(
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
      const { session } = sessionHarness({ record: record() });
      const listener = vi.fn();
      session.subscribe(listener);

      session.commitTitle('Second title');
      await settle();

      expect(session.getSlug()).toBe('second-title');
      expect(listener).toHaveBeenCalled();
    });
  });
});
