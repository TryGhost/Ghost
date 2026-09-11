import { describe, expect, it, vi } from 'vitest';
import { serializePostPayload } from '@tryghost/admin-x-framework/api/post-contract';
import { createEditorSession, type EditorCreatePayload } from './editor-session';
import type { EditorRecord } from './projection';
import { PUBLISHED_AT_MUST_BE_PAST, publishedAtInFuture } from './settings-fields';
import { deferred } from '@/utils/deferred';

const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PAST = '2020-06-01T10:00:00.000Z';
const OLDER = '2019-03-04T08:30:00.000Z';
// What a real publish stamps: the same minute as PAST, with seconds of its own.
const STAMPED = '2020-06-01T10:00:37.000Z';
const NEXT_MINUTE = '2020-06-01T10:01:00.000Z';

/** Milliseconds zeroed, as the engine's own target is. */
function future(): string {
  const time = Date.now() + 60 * 60 * 1000;
  return new Date(time - (time % 1000)).toISOString();
}

function publishTimeSession(status: EditorRecord['status'], publishedAt: string | null) {
  let saved: EditorRecord = {
    id: 'post-id',
    uuid: 'post-uuid',
    url: 'https://example.com/post/',
    title: 'Post',
    slug: 'post',
    status,
    visibility: 'public',
    tiers: [],
    lexical: null,
    updated_at: LOADED_AT,
    published_at: publishedAt,
    tags: [],
  };
  let saves = 0;
  const persist = (payload: EditorCreatePayload) => {
    saves += 1;
    // The payload is not a record, so the post serializer stands in for the
    // transport to resolve it into the fields a saved record carries.
    const serialized = serializePostPayload(payload);
    saved = { ...saved, ...serialized, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return Promise.resolve(saved);
  };
  const create = vi.fn(persist);
  const update = vi.fn(persist);
  const session = createEditorSession({
    record: saved,
    saveFailureMessage: 'Saving failed',
    onIdAcquired: vi.fn(),
    onError: vi.fn(),
    transport: { create, update, generateSlug: () => Promise.resolve('post') },
  });
  session.setBaseline(null);
  return { session, create, update };
}

describe('publishedAtInFuture', () => {
  it.each(['draft', 'published'] as const)(
    'refuses a %s post a publish time yet to come',
    (status) => {
      expect(publishedAtInFuture(status, '2026-01-02T00:00:00.000Z', Date.parse(LOADED_AT))).toBe(
        true,
      );
    },
  );

  it.each(['draft', 'published'] as const)(
    'accepts a %s post a publish time in the past',
    (status) => {
      expect(publishedAtInFuture(status, PAST, Date.parse(LOADED_AT))).toBe(false);
    },
  );

  it('refuses the current instant, as Ember’s isSameOrAfter does', () => {
    expect(publishedAtInFuture('draft', LOADED_AT, Date.parse(LOADED_AT))).toBe(true);
  });

  it.each(['scheduled', 'sent'] as const)('leaves a %s post’s publish time alone', (status) => {
    expect(publishedAtInFuture(status, '2026-01-02T00:00:00.000Z', Date.parse(LOADED_AT))).toBe(
      false,
    );
  });

  it('has nothing to check without a publish time', () => {
    expect(publishedAtInFuture('draft', null, Date.parse(LOADED_AT))).toBe(false);
  });
});

describe('staging the publish time', () => {
  it('sends a draft’s edited publish time as a UTC instant', async () => {
    const { session, update } = publishTimeSession('draft', null);

    session.editPublishedAt(PAST);
    expect(session.getPublishedAt()).toBe(PAST);
    expect(session.isDirty()).toBe(true);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({ published_at: PAST, status: 'draft' });
    expect(session.isDirty()).toBe(false);
  });

  it('re-times a published post without moving its status', async () => {
    const { session, update } = publishTimeSession('published', PAST);

    session.editPublishedAt(OLDER);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({ published_at: OLDER, status: 'published' });
  });

  it('is clean again once the writer returns the saved time', () => {
    const { session } = publishTimeSession('published', PAST);

    session.editPublishedAt(OLDER);
    expect(session.isDirty()).toBe(true);

    session.editPublishedAt(PAST);
    expect(session.isDirty()).toBe(false);
    expect(session.hasUnsavedContent()).toBe(false);
  });

  it('keeps the stored seconds when the field returns the minute already saved', async () => {
    const { session, update } = publishTimeSession('published', STAMPED);

    // What the field commits on blur: the same minute, with seconds zeroed.
    session.editPublishedAt(PAST);

    expect(session.getPublishedAt()).toBe(STAMPED);
    expect(session.isDirty()).toBe(false);
    expect(session.hasUnsavedContent()).toBe(false);

    session.commitField();
    await Promise.resolve();
    expect(update).not.toHaveBeenCalled();
  });

  it('preserves an undo and its stored seconds through an older save', async () => {
    const { session, update } = publishTimeSession('published', STAMPED);
    const pending = deferred<void>();
    const persist = update.getMockImplementation()!;
    update.mockImplementationOnce(async (payload) => {
      await pending.promise;
      return persist(payload);
    });

    session.editPublishedAt(OLDER);
    const save = session.dispatchExplicit();
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    session.editPublishedAt(PAST);

    expect(session.hasUnsavedContent()).toBe(true);
    pending.resolve();
    expect(await save).toMatchObject({ kind: 'saved' });
    expect(session.getPublishedAt()).toBe(STAMPED);
    expect(session.isDirty()).toBe(true);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[1][0].published_at).toBe(STAMPED);
    expect(session.isDirty()).toBe(false);
  });

  it('retains a newer time through a matching refetch and an older save', async () => {
    const { session, update } = publishTimeSession('published', PAST);
    const pending = deferred<void>();
    const persist = update.getMockImplementation()!;
    update.mockImplementationOnce(async (payload) => {
      await pending.promise;
      return persist(payload);
    });

    session.patchFields({ custom_excerpt: 'An unrelated edit' });
    const save = session.dispatchExplicit();
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    session.editPublishedAt(OLDER);
    session.recordRefetched({
      id: 'post-id',
      uuid: 'post-uuid',
      url: 'https://example.com/post/',
      title: 'Post',
      slug: 'post',
      status: 'published',
      lexical: null,
      updated_at: '2026-01-01T00:00:01.000Z',
      published_at: OLDER,
      tags: [],
    });

    pending.resolve();
    expect(await save).toMatchObject({ kind: 'saved' });
    expect(session.getPublishedAt()).toBe(OLDER);
    expect(session.isDirty()).toBe(true);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[1][0].published_at).toBe(OLDER);
    expect(session.isDirty()).toBe(false);
  });

  it('releases a newer edit when the save already carries its time', async () => {
    const { session, update } = publishTimeSession('published', PAST);
    const pending = deferred<void>();
    const persist = update.getMockImplementation()!;
    update.mockImplementationOnce(async (payload) => {
      await pending.promise;
      return persist(payload);
    });

    session.editPublishedAt(OLDER);
    const save = session.dispatchExplicit();
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    session.editPublishedAt(PAST);
    session.editPublishedAt(OLDER);

    pending.resolve();
    expect(await save).toMatchObject({ kind: 'saved' });
    expect(session.getPublishedAt()).toBe(OLDER);
    expect(session.isDirty()).toBe(false);
    expect(session.hasUnsavedContent()).toBe(false);
  });

  it('releases an undo when the older save fails', async () => {
    const { session, update } = publishTimeSession('published', STAMPED);
    const pending = deferred<EditorRecord>();
    update.mockImplementationOnce(() => pending.promise);

    session.editPublishedAt(OLDER);
    const save = session.dispatchExplicit();
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    session.editPublishedAt(PAST);

    pending.reject(new Error('Offline'));
    expect(await save).toMatchObject({ kind: 'failed' });
    expect(session.getPublishedAt()).toBe(STAMPED);
    expect(session.hasUnsavedContent()).toBe(false);
  });

  it('does not let an unchanged sidebar value override an in-flight schedule', async () => {
    const { session, update } = publishTimeSession('draft', null);
    const scheduledAt = future();
    const pending = deferred<void>();
    const persist = update.getMockImplementation()!;
    update.mockImplementationOnce(async (payload) => {
      await pending.promise;
      return persist(payload);
    });

    session.editPublishedAt(PAST);
    const save = session.dispatchSchedule({ publishedAt: scheduledAt });
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    session.editPublishedAt(PAST);

    pending.resolve();
    expect(await save).toMatchObject({ kind: 'saved' });
    expect(session.getPublishedAt()).toBe(scheduledAt);
    expect(session.isDirty()).toBe(false);
  });

  it('sends the chosen minute once the writer moves off the saved one', async () => {
    const { session, update } = publishTimeSession('published', STAMPED);

    session.editPublishedAt(NEXT_MINUTE);
    expect(session.isDirty()).toBe(true);

    expect(await session.dispatchExplicit()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({ published_at: NEXT_MINUTE });
  });

  it('counts a staged time as the writer’s unsaved work', () => {
    const { session } = publishTimeSession('published', PAST);

    session.editPublishedAt(OLDER);

    expect(session.hasUnsavedContent()).toBe(true);
  });

  it('refuses a save whose publish time has not passed', async () => {
    const { session, update } = publishTimeSession('published', PAST);

    session.editPublishedAt(future());

    expect(await session.dispatchExplicit()).toMatchObject({
      kind: 'failed',
      error: { kind: 'validation', message: PUBLISHED_AT_MUST_BE_PAST },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('holds back a draft’s field save while the publish time has not passed', async () => {
    const { session, update } = publishTimeSession('draft', null);

    session.editPublishedAt(future());
    session.commitField();
    await Promise.resolve();

    expect(update).not.toHaveBeenCalled();
    // Staged, not attempted: no save the writer did not ask for may fail.
    expect(session.getState().kind).toBe('idle');
  });

  it('leaves a status command’s own publish time untouched', async () => {
    const { session, update } = publishTimeSession('draft', null);
    const scheduledAt = future();

    expect(await session.dispatchSchedule({ publishedAt: scheduledAt })).toMatchObject({
      kind: 'saved',
    });
    expect(update.mock.calls[0][0]).toMatchObject({
      published_at: scheduledAt,
      status: 'scheduled',
    });
  });

  it('publishes at a staged time the writer backdated to', async () => {
    const { session, update } = publishTimeSession('draft', null);

    session.editPublishedAt(PAST);

    expect(await session.dispatchPublish()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({ published_at: PAST, status: 'published' });
  });

  it('refuses to publish at a staged time that has not passed', async () => {
    const { session, update } = publishTimeSession('draft', null);

    session.editPublishedAt(future());

    expect(await session.dispatchPublish()).toMatchObject({
      kind: 'failed',
      error: { kind: 'validation', message: PUBLISHED_AT_MUST_BE_PAST },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('publishes a scheduled post at the time it already carries', async () => {
    const scheduledAt = future();
    const { session, update } = publishTimeSession('scheduled', scheduledAt);

    expect(await session.dispatchPublish()).toMatchObject({ kind: 'saved' });
    expect(update.mock.calls[0][0]).toMatchObject({
      published_at: scheduledAt,
      status: 'published',
    });
  });

  it('refuses to unpublish into a staged time that has not passed', async () => {
    const { session, update } = publishTimeSession('published', PAST);

    session.editPublishedAt(future());

    expect(await session.dispatchRevert()).toMatchObject({
      kind: 'failed',
      error: { kind: 'validation', message: PUBLISHED_AT_MUST_BE_PAST },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('schedules at the flow’s time and releases the one the sidebar staged', async () => {
    const { session, update } = publishTimeSession('draft', null);
    const scheduledAt = future();

    session.editPublishedAt(PAST);
    expect(await session.dispatchSchedule({ publishedAt: scheduledAt })).toMatchObject({
      kind: 'saved',
    });

    expect(update.mock.calls[0][0]).toMatchObject({ published_at: scheduledAt });
    expect(session.getPublishedAt()).toBe(scheduledAt);
    expect(session.isDirty()).toBe(false);
  });

  it('keeps a staged time through a refetch that does not carry it', () => {
    const { session } = publishTimeSession('published', PAST);

    session.editPublishedAt(OLDER);
    session.recordRefetched({
      id: 'post-id',
      uuid: 'post-uuid',
      url: 'https://example.com/post/',
      title: 'Post',
      slug: 'post',
      status: 'published',
      lexical: null,
      updated_at: '2026-01-01T00:00:05.000Z',
      published_at: PAST,
      tags: [],
    });

    expect(session.getPublishedAt()).toBe(OLDER);
    expect(session.isDirty()).toBe(true);
  });

  it('releases a staged time a refetch has caught up with', () => {
    const { session } = publishTimeSession('published', PAST);

    session.editPublishedAt(OLDER);
    session.recordRefetched({
      id: 'post-id',
      uuid: 'post-uuid',
      url: 'https://example.com/post/',
      title: 'Post',
      slug: 'post',
      status: 'published',
      lexical: null,
      updated_at: '2026-01-01T00:00:05.000Z',
      published_at: OLDER,
      tags: [],
    });

    expect(session.isDirty()).toBe(false);
  });
});
