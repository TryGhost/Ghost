import { describe, expect, it } from 'vitest';
import { ValidationError } from '@tryghost/admin-x-framework/errors';
import { buildLexicalParagraph } from '@tryghost/test-data';
import type { PostStatus } from '@/editor/engine/save-engine';
import {
  LOADED_AT,
  body,
  record,
  serializedFields,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';
import type { EditorEditPayload } from './editor-session';
import type { EditorRecord } from './projection';
import {
  EXCERPT_MAX,
  META_TITLE_MAX,
  META_TITLE_TOO_LONG,
  TITLE_MAX,
  TITLE_TOO_LONG,
} from './settings-fields';

const PUBLISHED_AT = '2025-12-01T00:00:00.000Z';
const EARLIER = '2025-11-20T08:30:00.000Z';
const FIRST_SAVE_AT = '2026-01-01T00:00:01.000Z';
const THEIR_SAVE_AT = '2026-01-01T00:00:05.000Z';
const NEWS = { id: 'tag1', name: 'News', slug: 'news' };

/** The canvas as the session loaded it, which a settings save sends back unchanged. */
const SAVED_CANVAS = {
  title: 'Hello',
  slug: 'hello',
  lexical: buildLexicalParagraph('Hello'),
  feature_image: null,
};

// Core refuses a stale token for writes to the posts row or its relations; these tests vary the canvas.
const POSTS_ROW_CANVAS = ['title', 'slug', 'lexical', 'feature_image'] as const;

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

/** A published post whose server copy is `server`, answering writes as Core's collision check does. */
function onServer(server: EditorRecord) {
  const loaded = record({ status: 'published', published_at: PUBLISHED_AT, tags: [] });
  const built = sessionHarness(
    { record: loaded, acknowledged: server, baseline: loaded.lexical },
    { applied: serializedFields },
  );
  const persist = built.update.getMockImplementation()!;
  built.update.mockImplementation((payload: EditorEditPayload, options) => {
    const movesRow = POSTS_ROW_CANVAS.some(
      (key) => key in payload && (payload[key] ?? null) !== (server[key] ?? null),
    );
    if (movesRow && payload.updated_at !== server.updated_at) {
      built.state.updates.push({ payload });
      return Promise.reject(updateCollision());
    }
    return persist(payload, options);
  });
  return built;
}

function serverRefusal(context: string): ValidationError {
  return new ValidationError(new Response(null, { status: 422 }), {
    errors: [
      {
        code: '',
        context,
        details: null,
        ghostErrorCode: null,
        help: '',
        id: 'refusal',
        message: 'Validation error, cannot edit post.',
        property: null,
        type: 'ValidationError',
      },
    ],
  });
}

describe('createEditorSession', () => {
  describe('settings saves', () => {
    it.each<PostStatus>(['published', 'scheduled', 'sent'])(
      'saves a %s post’s settings change at once over the saved canvas, leaving staged content for Update',
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
            payload: {
              id: 'abc123',
              updated_at: LOADED_AT,
              ...SAVED_CANVAS,
              tags: [{ id: 'tag1' }],
            },
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

    it('collides rather than move onto another writer’s canvas, keeping what is staged', async () => {
      const theirs = {
        ...record({ status: 'published', published_at: PUBLISHED_AT, tags: [] }),
        title: 'Their title',
        lexical: buildLexicalParagraph('Their body'),
        updated_at: THEIR_SAVE_AT,
      };
      const { session, state } = onServer(theirs);
      session.patchTitle('A staged title');
      session.patchLexical(body('A staged body'));

      session.patchFields({ meta_title: 'A better title for search' });
      session.commitSettings();
      await settle();

      expect(state.updates.map(({ payload }) => payload)).toEqual([
        {
          id: 'abc123',
          updated_at: LOADED_AT,
          ...SAVED_CANVAS,
          meta_title: 'A better title for search',
        },
      ]);
      expect(session.getState()).toMatchObject({ kind: 'conflict', intent: 'settings' });
      expect(session.getSaveSnapshot().updatedAt).toBe(LOADED_AT);
      expect(session.getFields()).toMatchObject({
        title: 'A staged title',
        lexical: JSON.stringify(body('A staged body')),
        meta_title: 'A better title for search',
      });
    });

    it('moves the token when nobody else has written, with the canvas still staged', async () => {
      const { session, state } = onServer(
        record({ status: 'published', published_at: PUBLISHED_AT, tags: [] }),
      );
      session.patchTitle('A staged title');
      session.patchLexical(body('A staged body'));

      session.patchFields({ meta_title: 'A better title for search' });
      session.commitSettings();
      await settle();

      expect(state.updates).toHaveLength(1);
      expect(session.getState()).toEqual({ kind: 'idle' });
      expect(session.getSaveSnapshot()).toMatchObject({
        updatedAt: FIRST_SAVE_AT,
        isDirty: true,
        settingsDirty: false,
      });
      expect(session.getFields()).toMatchObject({
        title: 'A staged title',
        lexical: JSON.stringify(body('A staged body')),
      });
    });

    it('adopts the alt text and caption another writer left, which its answer carries', async () => {
      const { session, state } = savedAs('published');
      // Core stores both beside the post, so their edit left the token as it was.
      state.acknowledged = {
        ...state.acknowledged,
        feature_image_alt: 'Their alt',
        feature_image_caption: 'Their caption',
      };

      session.patchFields({ tags: [NEWS] });
      session.commitSettings();
      await settle();

      expect(state.updates[0].payload).not.toHaveProperty('feature_image_caption');
      expect(session.getFields()).toMatchObject({
        feature_image_alt: 'Their alt',
        feature_image_caption: 'Their caption',
      });

      session.patchTitle('A staged title');
      await session.dispatchExplicit();

      expect(state.updates[1].payload).toMatchObject({
        title: 'A staged title',
        feature_image_alt: 'Their alt',
        feature_image_caption: 'Their caption',
      });
    });

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

    it('sends the excerpt under the title as saved, and the panel’s own as typed', async () => {
      const { session, state } = savedAs('published');

      session.patchExcerpt('Typed under the title');
      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();

      expect(state.updates[0].payload).toEqual({
        id: 'abc123',
        updated_at: LOADED_AT,
        ...SAVED_CANVAS,
        custom_excerpt: 'Saved excerpt',
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
        ...SAVED_CANVAS,
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
        {
          id: 'abc123',
          updated_at: LOADED_AT,
          ...SAVED_CANVAS,
          custom_excerpt: 'Saved excerpt',
          featured: true,
        },
      ]);
      expect(session.getView().pendingSave).toEqual({ blockedBy: null });
      expect(await session.dispatchExplicit()).toMatchObject({
        kind: 'failed',
        error: { kind: 'validation', message: TITLE_TOO_LONG },
      });
    });

    it('drops the warning a setting raised once it is back to saved, with a body staged', async () => {
      const { session, state } = savedAs('published');
      session.patchLexical(body('A staged body'));

      session.patchFields({ meta_title: 'a'.repeat(META_TITLE_MAX + 1) });
      session.commitSettings();
      await settle();
      expect(session.getView().pendingSave).toEqual({
        blockedBy: { kind: 'validation', message: META_TITLE_TOO_LONG },
      });

      session.patchFields({ meta_title: null });
      session.commitSettings();
      await settle();

      expect(state.updates).toHaveLength(0);
      expect(session.getView().pendingSave).toEqual({ blockedBy: null });
    });

    it('carries a moved publish time, and no status, on a published post', async () => {
      const { session, state } = savedAs('published');

      session.editPublishedAt(EARLIER);
      session.commitSettings();
      await settle();

      expect(state.updates[0].payload).toEqual({
        id: 'abc123',
        updated_at: LOADED_AT,
        ...SAVED_CANVAS,
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
      const settingsSave = { id: 'abc123', updated_at: LOADED_AT, ...SAVED_CANVAS, featured: true };
      expect(state.updates.map(({ payload }) => payload)).toEqual([settingsSave, settingsSave]);
      expect(session.getLiveLexical()).toBe(JSON.stringify(body('A staged body')));
    });

    it('retries a settings save the server refused, though nothing has changed since', async () => {
      const { session, state, update } = savedAs('published');
      update.mockImplementationOnce((payload: EditorEditPayload) => {
        state.updates.push({ payload });
        return Promise.reject(serverRefusal('Something the server refused.'));
      });

      session.patchFields({ featured: true });
      session.commitSettings();
      await settle();
      expect(session.getState()).toMatchObject({
        kind: 'error',
        intent: 'settings',
        error: { kind: 'validation', message: 'Something the server refused.' },
      });

      expect(await session.retrySave()).toMatchObject({ kind: 'saved', executedAs: 'settings' });
      expect(state.updates).toHaveLength(2);
      expect(session.isDirty()).toBe(false);
    });

    it.each([false, true])(
      'ends the refusal once the refused setting is back to saved (body staged: %s)',
      async (staged) => {
        const { session, state, update } = savedAs('published');
        if (staged) {
          session.patchLexical(body('A staged body'));
        }
        update.mockImplementationOnce((payload: EditorEditPayload) => {
          state.updates.push({ payload });
          return Promise.reject(serverRefusal('Something the server refused.'));
        });
        session.patchFields({ featured: true });
        session.commitSettings();
        await settle();
        expect(session.getState()).toMatchObject({ kind: 'error', intent: 'settings' });

        session.patchFields({ featured: false });
        session.commitSettings();
        await settle();

        expect(session.getState()).toEqual({ kind: 'idle' });
        expect(session.isDirty()).toBe(staged);
        expect(session.hasUnsavedContent()).toBe(staged);
        expect(session.getView().pendingSave).toEqual(staged ? { blockedBy: null } : null);
        expect(state.updates).toHaveLength(1);
      },
    );

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
