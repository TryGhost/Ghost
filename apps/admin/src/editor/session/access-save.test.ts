import { describe, expect, it, vi } from 'vitest';
import { serializePostPayload } from '@tryghost/admin-x-framework/api/post-contract';
import { createEditorSession, type EditorWritePayload } from './editor-session';
import type { EditorRecord } from './projection';

const TIERS = [{ id: 'gold' }, { id: 'silver' }];

function accessSession(visibility: string | null, tiers = TIERS) {
  let saved: EditorRecord = {
    id: 'post-id',
    uuid: 'post-uuid',
    url: 'https://example.com/post/',
    title: 'Post',
    slug: 'post',
    status: 'draft',
    visibility: visibility ?? 'paid',
    tiers,
    lexical: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: null,
    tags: [],
  };
  let saves = 0;
  const persist = (payload: EditorWritePayload) => {
    // Exercise the same serialization as the post/page transports: an unpaired
    // tier visibility disappears before the API sees it.
    const serialized = serializePostPayload(payload);
    saves += 1;
    saved = { ...saved, ...serialized, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return Promise.resolve(saved);
  };
  const create = vi.fn(persist);
  const update = vi.fn(persist);
  const session = createEditorSession({
    record: visibility === null ? undefined : saved,
    saveFailureMessage: 'Saving failed',
    onIdAcquired: vi.fn(),
    onError: vi.fn(),
    transport: { create, update, generateSlug: () => Promise.resolve('post') },
  });
  session.setBaseline(null);
  return { session, create, update };
}

describe('saving post access', () => {
  it.each(['public', 'members', 'paid'])(
    'persists a change from %s to specific tiers with unchanged tier IDs',
    async (visibility) => {
      const { session, update } = accessSession(visibility);
      session.patchFields({ visibility: 'tiers', tiers: TIERS.map(({ id }) => ({ id })) });

      expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
      expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: TIERS });
      expect(session.isDirty()).toBe(false);

      // Sending the pair must not retain ownership after the save succeeds.
      session.patchFields({ featured: true });
      await session.dispatchExplicit();
      expect(update.mock.calls[1][0]).not.toHaveProperty('visibility');
      expect(update.mock.calls[1][0]).not.toHaveProperty('tiers');
      session.dispose();
    },
  );

  it.each([null, 'tiers'])(
    'refuses explicit saves and publishing with an empty tier selection (saved visibility: %s)',
    async (visibility) => {
      const { session, create, update } = accessSession(visibility);
      session.patchFields({ visibility: 'tiers', tiers: [] });
      session.commitField();

      for (const save of [session.dispatchExplicit, session.dispatchPublish]) {
        expect(await save()).toMatchObject({
          kind: 'failed',
          error: { kind: 'validation', message: 'Please select at least one tier' },
        });
      }
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [] });
      expect(session.hasUnsavedContent()).toBe(true);

      // Correcting the selection must recover from the validation failure.
      session.patchFields({ tiers: [TIERS[0]] });
      expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
      expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [TIERS[0]] });
      expect(session.isDirty()).toBe(false);
      session.dispose();
    },
  );

  it('lets the server apply untouched access defaults on create', async () => {
    const { session, create } = accessSession(null);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(create.mock.calls[0][0]).not.toHaveProperty('visibility');
    expect(create.mock.calls[0][0]).not.toHaveProperty('tiers');
    expect(session.getFields()).toMatchObject({ visibility: 'paid', tiers: TIERS });
    expect(session.isDirty()).toBe(false);
    session.dispose();
  });
});
