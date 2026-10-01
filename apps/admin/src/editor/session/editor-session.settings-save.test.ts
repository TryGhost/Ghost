import { describe, expect, it } from 'vitest';
import type { PostStatus } from '@/editor/engine/save-engine';
import {
  LOADED_AT,
  body,
  record,
  serializedFields,
  sessionHarness,
} from '@/editor/session/__test-utils__/session-harness';
import { EXCERPT_MAX, TITLE_MAX, TITLE_TOO_LONG } from './settings-fields';

const PUBLISHED_AT = '2025-12-01T00:00:00.000Z';
const EARLIER = '2025-11-20T08:30:00.000Z';
const FIRST_SAVE_AT = '2026-01-01T00:00:01.000Z';
const NEWS = { id: 'tag1', name: 'News', slug: 'news' };

// A settings save awaits the slug port and the transport before it lands.
const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

function savedAs(status: PostStatus, hooks: Parameters<typeof sessionHarness>[1] = {}) {
  const loaded = record({
    status,
    published_at: status === 'draft' ? null : PUBLISHED_AT,
    tags: [],
    featured: false,
    custom_excerpt: 'Saved excerpt',
  });
  return sessionHarness(
    { record: loaded, acknowledged: loaded, baseline: loaded.lexical },
    { applied: serializedFields, ...hooks },
  );
}

describe('createEditorSession', () => {
  describe('settings saves', () => {
    it.each<PostStatus>(['published', 'scheduled', 'sent'])(
      'saves a %s post’s settings change at once and alone, leaving staged content for Update',
      async (status) => {
        const { session, state } = savedAs(status);
        session.patchTitle('A staged title');
        session.patchLexical(body('A staged body'));
        session.patchFeatureImage({ feature_image: 'https://example.com/staged.png' });

        session.patchFields({ tags: [NEWS] });
        session.commitSettings();
        await settle();

        expect(state.updates).toEqual([
          {
            payload: { id: 'abc123', updated_at: LOADED_AT, tags: [{ id: 'tag1' }] },
            saveRevision: false,
          },
        ]);
        expect(session.getFields()).toMatchObject({
          title: 'A staged title',
          lexical: JSON.stringify(body('A staged body')),
          feature_image: 'https://example.com/staged.png',
          tags: [expect.objectContaining({ id: 'tag1' })],
        });
        expect(session.getSaveSnapshot()).toMatchObject({
          status,
          updatedAt: FIRST_SAVE_AT,
          isDirty: true,
          settingsDirty: false,
        });

        await session.dispatchExplicit();

        expect(state.updates[1].payload).toMatchObject({
          title: 'A staged title',
          lexical: JSON.stringify(body('A staged body')),
          feature_image: 'https://example.com/staged.png',
          status,
          updated_at: FIRST_SAVE_AT,
        });
        expect(state.updates[1].payload).not.toHaveProperty('tags');
        expect(session.isDirty()).toBe(false);
      },
    );

    it('saves a draft’s settings change with the rest of the document', async () => {
      const { session, state } = savedAs('draft');
      session.patchTitle('A new title');

      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();

      expect(state.updates).toHaveLength(1);
      expect(state.updates[0].payload).toMatchObject({
        title: 'A new title',
        featured: true,
        status: 'draft',
      });
      expect(session.isDirty()).toBe(false);
    });

    it('sends nothing for a settings commit that changed no setting', async () => {
      const { session, state } = savedAs('published');
      session.patchLexical(body('A staged body'));

      session.commitSettings();
      await settle();

      expect(state.updates).toHaveLength(0);
      expect(session.isDirty()).toBe(true);
    });

    it('leaves the excerpt under the title for Update and sends the panel’s own', async () => {
      const { session, state } = savedAs('published');

      session.patchExcerpt('Typed under the title');
      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();

      expect(state.updates[0].payload).toEqual({
        id: 'abc123',
        updated_at: LOADED_AT,
        featured: true,
      });
      expect(session.getFields().custom_excerpt).toBe('Typed under the title');
      expect(session.isDirty()).toBe(true);

      session.patchFields({ custom_excerpt: 'Typed in the panel' });
      session.commitSettings();
      await settle();

      expect(state.updates[1].payload).toEqual({
        id: 'abc123',
        updated_at: FIRST_SAVE_AT,
        custom_excerpt: 'Typed in the panel',
      });
      expect(session.isDirty()).toBe(false);
    });

    it('is not held by an over-long title or excerpt it leaves for Update', async () => {
      const { session, state } = savedAs('published');
      session.patchTitle('a'.repeat(TITLE_MAX + 1));
      session.patchExcerpt('a'.repeat(EXCERPT_MAX + 1));

      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();

      expect(state.updates.map(({ payload }) => payload)).toEqual([
        { id: 'abc123', updated_at: LOADED_AT, featured: true },
      ]);
      expect(session.getView().pendingSave).toEqual({ blockedBy: null });
      expect(await session.dispatchExplicit()).toMatchObject({
        kind: 'failed',
        error: { kind: 'validation', message: TITLE_TOO_LONG },
      });
    });

    it('carries a moved publish time, and no status, on a published post', async () => {
      const { session, state } = savedAs('published');

      session.editPublishedAt(EARLIER);
      session.commitSettings();
      await settle();

      expect(state.updates[0].payload).toEqual({
        id: 'abc123',
        updated_at: LOADED_AT,
        published_at: EARLIER,
      });
      expect(session.getPublishedAt()).toBe(EARLIER);
      expect(session.isDirty()).toBe(false);
    });

    it('lets the writer leave once the settings save lands, and asks while a body is staged', async () => {
      const { session, state } = savedAs('published');

      session.patchFields({ featured: true });
      session.commitSettings();
      expect(await session.leaveRequested()).toBe('proceed');
      expect(state.updates).toHaveLength(1);

      session.patchLexical(body('A staged body'));
      session.patchFields({ featured: false });
      session.commitSettings();
      expect(await session.leaveRequested()).toBe('confirm');
      expect(state.updates).toHaveLength(2);
    });

    it('keeps the edit when its settings save fails, and retries the settings alone', async () => {
      const { session, state } = savedAs('published', { failSave: (count) => count === 1 });
      session.patchLexical(body('A staged body'));

      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();

      expect(session.getState()).toMatchObject({ kind: 'error', intent: 'settings' });
      expect(session.getFields().featured).toBe(true);
      expect(session.isDirty()).toBe(true);

      expect(await session.retrySave()).toMatchObject({ kind: 'saved', executedAs: 'settings' });
      expect(state.updates.map(({ payload }) => payload)).toEqual([
        { id: 'abc123', updated_at: LOADED_AT, featured: true },
        { id: 'abc123', updated_at: LOADED_AT, featured: true },
      ]);
      expect(session.getLiveLexical()).toBe(JSON.stringify(body('A staged body')));
    });

    it('retries a draft’s failed save explicitly', async () => {
      const { session, state } = savedAs('draft', { failSave: (count) => count === 1 });

      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();

      expect(await session.retrySave()).toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      expect(state.updates[1].saveRevision).toBe(true);
    });
  });
});
