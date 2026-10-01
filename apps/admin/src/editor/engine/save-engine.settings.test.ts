import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostStatus } from './save-engine';
import {
  flush,
  FUTURE,
  PAST,
  sessionInvalid,
  setup,
  validation,
} from './__test-utils__/engine-harness';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const PUBLISHED_AT: Record<Exclude<PostStatus, 'draft'>, string> = {
  published: PAST,
  scheduled: FUTURE,
  sent: PAST,
};

describe('settings saves', () => {
  it.each<Exclude<PostStatus, 'draft'>>(['published', 'scheduled', 'sent'])(
    'saves a %s post’s settings straight away, keeping its status and asking for no revision',
    async (status) => {
      const h = setup({ status, publishedAt: PUBLISHED_AT[status], settingsDirty: true });

      const save = h.engine.dispatch('settings');
      await flush();

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'settings', requiresRevision: false },
        target: { status, publishedAt: PUBLISHED_AT[status] },
        saveRevision: false,
      });
      await h.succeed();
      await expect(save).resolves.toMatchObject({ kind: 'saved', executedAs: 'settings' });
      expect(h.snapshot.status).toBe(status);
    },
  );

  it('saves a draft’s settings as a field save would, pinned to draft', async () => {
    const h = setup({ publishedAt: PAST, settingsDirty: false });

    void h.engine.dispatch('settings');
    await flush();

    expect(h.requests[0]).toMatchObject({
      command: { kind: 'settings' },
      target: { status: 'draft', publishedAt: PAST },
      saveRevision: false,
    });
  });

  it('drops a settings save with no settings to carry, leaving the staged body pending', async () => {
    const h = setup({ status: 'published', publishedAt: PAST, settingsDirty: false });

    await expect(h.engine.dispatch('settings')).resolves.toEqual({
      kind: 'dropped',
      reason: 'clean',
    });
    expect(h.execute).not.toHaveBeenCalled();
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });
  });

  it('lets the writer leave once the settings save carrying the only change has landed', async () => {
    const h = setup({ status: 'published', publishedAt: PAST, settingsDirty: true });

    void h.engine.dispatch('settings');
    const decision = h.engine.leaveRequested();
    await flush();
    expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'settings' });

    await h.succeed();
    await expect(decision).resolves.toBe('proceed');
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it('still asks before leaving when a staged body outlives the settings save', async () => {
    const h = setup({ status: 'published', publishedAt: PAST, settingsDirty: true });
    h.reconcile.mockImplementation((_prepared, result) => {
      h.patch({ updatedAt: result.updatedAt, settingsDirty: false });
    });

    void h.engine.dispatch('settings');
    await h.succeed();

    expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });
    await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it('takes the pending slot from a field save and yields it to an explicit save', async () => {
    const h = setup();
    void h.engine.dispatch('explicit');
    await flush();

    void h.engine.dispatch('field');
    void h.engine.dispatch('settings');
    expect(h.engine.getState()).toEqual({
      kind: 'pending-coalesced',
      intent: 'explicit',
      pending: 'settings',
    });

    void h.engine.dispatch('explicit');
    expect(h.engine.getState()).toMatchObject({ pending: 'explicit' });
  });

  it('saves the settings a field commit queued beside once a publish lands', async () => {
    const h = setup({ settingsDirty: false });
    const publish = h.engine.dispatch('publish');
    await flush();
    h.edit();
    h.patch({ settingsDirty: true });
    const field = h.engine.dispatch('field');
    const settings = h.engine.dispatch('settings');

    await h.succeed();
    await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
    expect(h.requests[1]).toMatchObject({
      command: { kind: 'settings' },
      target: { status: 'published' },
    });

    await h.succeed();
    await expect(settings).resolves.toMatchObject({ kind: 'saved', executedAs: 'settings' });
    await expect(field).resolves.toMatchObject({ kind: 'saved', executedAs: 'settings' });
  });

  it('holds an invalid settings save as background work, without entering an error', async () => {
    const h = setup({ status: 'published', publishedAt: PAST, settingsDirty: true });
    h.prepare.mockResolvedValueOnce({ ok: false, error: validation });

    await expect(h.engine.dispatch('settings')).resolves.toEqual({
      kind: 'blocked',
      error: validation,
    });
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: validation });
    expect(h.execute).not.toHaveBeenCalled();
  });

  it('suppresses an unchanged settings save the server refused until the next edit', async () => {
    const h = setup({ status: 'published', publishedAt: PAST, settingsDirty: true });
    const refused = h.engine.dispatch('settings');
    await h.fail(validation);
    await expect(refused).resolves.toMatchObject({ kind: 'failed', executedAs: 'settings' });
    expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'settings', error: validation });

    await expect(h.engine.dispatch('settings')).resolves.toEqual({
      kind: 'dropped',
      reason: 'suppressed',
    });

    h.edit();
    const corrected = h.engine.dispatch('settings');
    await h.succeed();
    await expect(corrected).resolves.toMatchObject({ kind: 'saved' });
    expect(h.execute).toHaveBeenCalledTimes(2);
  });

  it('runs a frozen settings save again after re-authentication without asking', async () => {
    const h = setup({ status: 'published', publishedAt: PAST, settingsDirty: true });
    const save = h.engine.dispatch('settings');
    await h.fail(sessionInvalid);
    expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'settings' });

    h.engine.reauthSucceeded();
    await h.succeed();

    await expect(save).resolves.toMatchObject({ kind: 'saved', executedAs: 'settings' });
    expect(h.requests[1]).toMatchObject({
      command: { kind: 'settings' },
      target: { status: 'published' },
    });
  });
});
