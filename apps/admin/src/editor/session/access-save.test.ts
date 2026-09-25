import { describe, expect, it } from 'vitest';
import {
  LOADED_AT,
  record,
  serializedFields,
  sessionHarness,
  type HarnessHooks,
} from '@/editor/session/__test-utils__/session-harness';

const TIERS = [{ id: 'gold' }, { id: 'silver' }];

function accessSession(visibility: string | null, hooks: HarnessHooks = {}) {
  const saved = record({
    id: 'post-id',
    uuid: 'post-uuid',
    url: 'https://example.com/post/',
    title: 'Post',
    slug: 'post',
    status: 'draft',
    visibility: visibility ?? 'paid',
    tiers: TIERS,
    lexical: null,
    updated_at: LOADED_AT,
    published_at: null,
  });

  return sessionHarness(
    {
      record: visibility === null ? undefined : saved,
      acknowledged: saved,
      createdId: saved.id,
      saveFailureMessage: 'Saving failed',
      baseline: null,
    },
    // Exercise the same serialization as the post/page transports: an unpaired
    // tier visibility disappears before the API sees it.
    { applied: serializedFields, generateSlug: () => Promise.resolve('post'), ...hooks },
  );
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

  it('refuses explicit saves and publishing with an empty tier selection on a saved post', async () => {
    const { session, update } = accessSession('tiers');
    session.patchFields({ visibility: 'tiers', tiers: [] });
    session.commitField();

    for (const save of [session.dispatchExplicit, session.dispatchPublish]) {
      expect(await save()).toMatchObject({
        kind: 'failed',
        error: { kind: 'validation', message: 'Please select at least one tier.' },
      });
    }
    expect(update).not.toHaveBeenCalled();
    expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [] });
    expect(session.hasUnsavedContent()).toBe(true);

    // Correcting the selection must recover from the validation failure.
    session.patchFields({ tiers: [TIERS[0]] });
    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [TIERS[0]] });
    expect(session.isDirty()).toBe(false);
    session.dispose();
  });

  it('creates a new post with an empty tier selection and keeps the pair as the writer’s edit', async () => {
    const { session, state, create, update } = accessSession(null);
    session.patchFields({ visibility: 'tiers', tiers: [] });

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).not.toHaveProperty('visibility');
    expect(create.mock.calls[0][0]).not.toHaveProperty('tiers');
    expect(state.acquiredIds).toEqual(['post-id']);
    // The server answered with its default and the tiers a read carries; the
    // pair was never sent, so neither replaces the writer's choice.
    expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [] });
    expect(session.isDirty()).toBe(true);

    // The post exists now, so the same pair holds the next save.
    expect(await session.dispatchExplicit()).toMatchObject({
      kind: 'failed',
      error: { kind: 'validation', message: 'Please select at least one tier.' },
    });
    expect(update).not.toHaveBeenCalled();

    session.patchFields({ tiers: [TIERS[0]] });
    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({ visibility: 'tiers', tiers: [TIERS[0]] });
    expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [TIERS[0]] });
    expect(session.isDirty()).toBe(false);
    session.dispose();
  });

  it('sends a tier picked while the create is in flight together with the visibility', async () => {
    const harness = accessSession(null, {
      duringSave: () => harness.session.patchFields({ visibility: 'tiers', tiers: [TIERS[0]] }),
    });
    const { session, create, update } = harness;
    session.patchFields({ visibility: 'tiers', tiers: [] });

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(create.mock.calls[0][0]).not.toHaveProperty('visibility');
    expect(create.mock.calls[0][0]).not.toHaveProperty('tiers');
    // The visibility was never sent, so the acknowledgement does not move it
    // off the tier the writer picked in the meantime.
    expect(session.getFields()).toMatchObject({ visibility: 'tiers', tiers: [TIERS[0]] });
    expect(session.isDirty()).toBe(true);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({ visibility: 'tiers', tiers: [TIERS[0]] });
    expect(session.isDirty()).toBe(false);
    session.dispose();
  });

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
