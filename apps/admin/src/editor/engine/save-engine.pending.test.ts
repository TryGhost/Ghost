import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS, TIMED_SAVE_INTERVAL_MS, type PostStatus } from './save-engine';
import {
  flush,
  setup,
  validation,
  sessionInvalid,
  FUTURE,
  transport,
} from './__test-utils__/engine-harness';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('pending content', () => {
  it('reads edits without notifications or starting a save, and releases an undone edit', () => {
    const h = setup();
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.execute).not.toHaveBeenCalled();

    h.patch({ isDirty: false });
    expect(h.engine.getPendingSave()).toBeNull();
  });

  it.each<PostStatus>(['published', 'scheduled', 'sent'])(
    'retains %s edits until Update without blocking navigation',
    async (status) => {
      const h = setup({ status });
      await h.engine.dispatch('field');
      expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
      expect(h.execute).not.toHaveBeenCalled();

      const save = h.engine.dispatch('explicit');
      await h.succeed();
      await expect(save).resolves.toMatchObject({ kind: 'saved' });
      expect(h.engine.getPendingSave()).toBeNull();
    },
  );

  it('holds an armed autosave and a field commit on the same invalid document', async () => {
    const h = setup();
    const autosave = h.engine.dispatch('autosave');
    h.edit();
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    const field = h.engine.dispatch('field');
    await flush();

    await expect(autosave).resolves.toEqual({ kind: 'blocked', error: validation });
    await expect(field).resolves.toEqual({ kind: 'blocked', error: validation });
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: validation });
    await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
    expect(h.execute).not.toHaveBeenCalled();

    // Correcting and committing persists the newest complete document once.
    h.edit();
    h.prepare.mockImplementation((request) => Promise.resolve({ ok: true, prepared: request }));
    const corrected = h.engine.dispatch('field');
    await h.succeed();
    await expect(corrected).resolves.toMatchObject({ kind: 'saved' });
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].snapshot.version).toBe(3);
    expect(h.engine.getPendingSave()).toBeNull();
  });

  it.each(['before-dispatch', 'same-version', 'slug-settled', 'slug-generated'])(
    'releases local validation when a correction is clean at %s',
    async (when) => {
      const h = setup();
      h.prepare.mockResolvedValueOnce({ ok: false, error: validation });
      await h.engine.dispatch('field');
      if (when !== 'same-version') {
        h.edit();
      }
      if (when === 'before-dispatch' || when === 'same-version') {
        h.patch({ isDirty: false });
        await expect(h.engine.dispatch('field')).resolves.toEqual({
          kind: 'dropped',
          reason: 'clean',
        });
      } else if (when === 'slug-settled') {
        const release = h.holdSlugWork();
        const correction = h.engine.dispatch('field');
        h.patch({ isDirty: false });
        await release();
        await expect(correction).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      } else {
        h.holdSlugRequests();
        const correction = h.engine.dispatch('field');
        await flush();
        h.patch({ isDirty: false });
        await h.resolveSlug('hello', 'unchanged');
        await expect(correction).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      }
      expect(h.engine.getPendingSave()).toBeNull();
      h.edit();
      expect(h.engine.getPendingSave()?.blockedBy).toBeNull();
      expect(h.prepare).toHaveBeenCalledTimes(1);
      expect(h.execute).not.toHaveBeenCalled();
    },
  );

  it('starts a corrected new post immediately after a clean validation exit', async () => {
    const h = setup({ id: null, updatedAt: null });
    h.prepare.mockResolvedValueOnce({ ok: false, error: validation });
    await h.engine.dispatch('field');
    h.patch({ isDirty: false });
    await h.engine.dispatch('field');
    h.edit();
    const save = h.engine.dispatch('autosave');
    await flush();
    expect(h.requests).toHaveLength(1);
    await h.succeed();
    await expect(save).resolves.toMatchObject({ kind: 'saved' });
  });

  it('keeps server suppression when a same-version snapshot becomes clean', async () => {
    const h = setup();
    const save = h.engine.dispatch('field');
    await h.fail(validation);
    await save;
    h.patch({ isDirty: false });
    await expect(h.engine.dispatch('field')).resolves.toEqual({
      kind: 'dropped',
      reason: 'suppressed',
    });
    h.patch({ isDirty: true });
    await expect(h.engine.dispatch('field')).resolves.toEqual({
      kind: 'dropped',
      reason: 'suppressed',
    });
  });

  it('holds invalid body autosaves without entering a save error', async () => {
    const h = setup();
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    const save = h.engine.dispatch('autosave');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    await expect(save).resolves.toEqual({ kind: 'blocked', error: validation });
    expect(h.engine.getPendingSave()?.blockedBy).toBe(validation);
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.execute).not.toHaveBeenCalled();
    await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
  });

  it('keeps validation visible through unrelated edits until preparation passes', async () => {
    const h = setup();
    h.prepare.mockResolvedValueOnce({ ok: false, error: validation });
    await h.engine.dispatch('field');
    h.edit();
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: validation });

    const save = h.engine.dispatch('autosave');
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: validation });
    const seen: Array<ReturnType<typeof h.engine.getPendingSave>> = [];
    h.engine.subscribe(() => seen.push(h.engine.getPendingSave()));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    expect(seen).toEqual([{ blockedBy: validation }, { blockedBy: null }]);
    await h.succeed();
    await save;
  });

  it('debounces repeated edits to an invalid new post', async () => {
    const h = setup({ id: null, updatedAt: null });
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    await expect(h.engine.dispatch('autosave')).resolves.toMatchObject({ kind: 'blocked' });
    for (let index = 0; index < 5; index += 1) {
      h.edit();
      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(100);
      expect(h.engine.getPendingSave()?.blockedBy).toBe(validation);
    }
    expect(h.prepare).toHaveBeenCalledTimes(1);
    expect(h.states.some((state) => state.kind === 'saving')).toBe(false);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    expect(h.prepare).toHaveBeenCalledTimes(2);
    expect(h.execute).not.toHaveBeenCalled();

    h.edit();
    h.prepare.mockImplementation((request) => Promise.resolve({ ok: true, prepared: request }));
    const corrected = h.engine.dispatch('autosave');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    await h.succeed();
    await expect(corrected).resolves.toMatchObject({ kind: 'saved' });
    expect(h.requests[0].snapshot.version).toBe(7);
  });

  it('retains server suppression through a passing preparation and a failed retry', async () => {
    const h = setup();
    const initial = h.engine.dispatch('explicit');
    await h.fail(validation);
    await initial;
    const retry = h.engine.dispatch('explicit');
    await flush();
    await expect(h.engine.dispatch('field')).resolves.toEqual({
      kind: 'dropped',
      reason: 'suppressed',
    });
    await h.fail(transport);
    await retry;
    await expect(h.engine.dispatch('field')).resolves.toEqual({
      kind: 'dropped',
      reason: 'suppressed',
    });
    h.edit();
    const corrected = h.engine.dispatch('field');
    await h.succeed();
    await expect(corrected).resolves.toMatchObject({ kind: 'saved' });
  });

  it('keeps edits made after submission pending even without another command', async () => {
    const h = setup();
    const first = h.engine.dispatch('field');
    await flush();
    h.edit();
    expect(h.engine.getState().kind).toBe('saving');
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });
    await h.succeed();
    await first;
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });
    expect(h.execute).toHaveBeenCalledTimes(1);

    const next = h.engine.dispatch('field');
    await h.succeed();
    await next;
    expect(h.requests[1].snapshot.version).toBe(2);
    expect(h.engine.getPendingSave()).toBeNull();
  });

  it('holds an invalid queued save after the active save finishes', async () => {
    const h = setup();
    const first = h.engine.dispatch('field');
    await flush();
    h.edit();
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    const second = h.engine.dispatch('field');
    await h.succeed();
    await first;
    await expect(second).resolves.toEqual({ kind: 'blocked', error: validation });
    expect(h.engine.getPendingSave()).toMatchObject({ blockedBy: validation });
    expect(h.execute).toHaveBeenCalledTimes(1);
    await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
  });

  it('fails an explicit publish promptly without replaying its email command after correction', async () => {
    const h = setup();
    h.prepare.mockResolvedValueOnce({ ok: false, error: validation });
    await expect(
      h.engine.dispatch('publish', { newsletter: 'news', emailOnly: true }),
    ).resolves.toMatchObject({ kind: 'failed', error: validation });
    expect(h.engine.getPendingSave()?.blockedBy).toBe(validation);
    h.edit();
    const corrected = h.engine.dispatch('field');
    await h.succeed();
    await corrected;
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].target).toEqual({ status: 'draft', publishedAt: null });
    expect(h.requests[0].command.kind).toBe('field');
  });

  it('replaces a previous validation hold when a same-version command can save', async () => {
    const h = setup({ publishedAt: FUTURE });
    h.prepare.mockResolvedValueOnce({ ok: false, error: validation });
    await h.engine.dispatch('field');
    expect(h.engine.getPendingSave()?.blockedBy).toBe(validation);

    // Scheduling permits the future date without requiring another content edit.
    const retry = h.engine.dispatch('schedule', { publishedAt: FUTURE });
    await flush();
    expect(h.requests).toHaveLength(1);
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: null });

    await h.fail(transport);
    await expect(retry).resolves.toMatchObject({ kind: 'failed', error: transport });
    expect(h.engine.getPendingSave()).toEqual({ blockedBy: transport });
  });

  it('retains content while authentication is pending and releases it on disposal', async () => {
    const h = setup();
    const save = h.engine.dispatch('field');
    await h.fail(sessionInvalid);
    expect(h.engine.getPendingSave()?.blockedBy).toBe(sessionInvalid);
    h.edit();
    expect(h.engine.getPendingSave()).toMatchObject({ blockedBy: sessionInvalid });
    h.engine.dispose();
    await expect(save).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
    expect(h.engine.getPendingSave()).toBeNull();
  });
});
