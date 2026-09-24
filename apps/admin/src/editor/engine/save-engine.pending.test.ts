import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS, TIMED_SAVE_INTERVAL_MS, type PostStatus } from './save-engine';
import { flush, setup, validation, sessionInvalid } from './__test-utils__/engine-harness';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('pending content', () => {
  it('registers edits without starting a save, and releases an undone edit', () => {
    const h = setup();
    h.engine.contentChanged();
    expect(h.engine.getPendingSave()).toEqual({ version: 1, reason: 'field-commit' });
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.execute).not.toHaveBeenCalled();

    h.patch({ isDirty: false });
    h.engine.contentChanged();
    expect(h.engine.getPendingSave()).toBeNull();
  });

  it.each<PostStatus>(['published', 'scheduled', 'sent'])(
    'retains %s edits until Update without blocking navigation',
    async (status) => {
      const h = setup({ status });
      h.engine.contentChanged();
      await h.engine.dispatch('field');
      expect(h.engine.getPendingSave()).toEqual({ version: 1, reason: 'update' });
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
    expect(h.engine.getPendingSave()?.reason).toBe('debounce');
    h.edit();
    h.engine.contentChanged();
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    const field = h.engine.dispatch('field');
    await flush();

    await expect(autosave).resolves.toEqual({ kind: 'blocked', error: validation });
    await expect(field).resolves.toEqual({ kind: 'blocked', error: validation });
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.engine.getPendingSave()).toEqual({
      version: 2,
      reason: 'validation',
      error: validation,
    });
    await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
    expect(h.execute).not.toHaveBeenCalled();

    // Correcting and committing persists the newest complete document once.
    h.edit();
    h.engine.contentChanged();
    h.prepare.mockImplementation((request) => Promise.resolve({ ok: true, prepared: request }));
    const corrected = h.engine.dispatch('field');
    await h.succeed();
    await expect(corrected).resolves.toMatchObject({ kind: 'saved' });
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].snapshot.version).toBe(3);
    expect(h.engine.getPendingSave()).toBeNull();
  });

  it('holds invalid body autosaves without entering a save error', async () => {
    const h = setup();
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    const save = h.engine.dispatch('autosave');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    await expect(save).resolves.toEqual({ kind: 'blocked', error: validation });
    expect(h.engine.getPendingSave()?.reason).toBe('validation');
    expect(h.engine.getState()).toEqual({ kind: 'idle' });
    expect(h.execute).not.toHaveBeenCalled();
    await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
  });

  it('keeps edits made after submission pending even without another command', async () => {
    const h = setup();
    const first = h.engine.dispatch('field');
    await flush();
    h.edit();
    h.engine.contentChanged();
    expect(h.engine.getState().kind).toBe('saving');
    expect(h.engine.getPendingSave()).toEqual({ version: 2, reason: 'field-commit' });
    await h.succeed();
    await first;
    expect(h.engine.getPendingSave()).toEqual({ version: 2, reason: 'field-commit' });
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
    h.engine.contentChanged();
    h.prepare.mockResolvedValue({ ok: false, error: validation });
    const second = h.engine.dispatch('field');
    await h.succeed();
    await first;
    await expect(second).resolves.toEqual({ kind: 'blocked', error: validation });
    expect(h.engine.getPendingSave()).toMatchObject({ version: 2, reason: 'validation' });
    expect(h.execute).toHaveBeenCalledTimes(1);
    await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
  });

  it('fails an explicit publish promptly without replaying its email command after correction', async () => {
    const h = setup();
    h.prepare.mockResolvedValueOnce({ ok: false, error: validation });
    await expect(
      h.engine.dispatch('publish', { newsletter: 'news', emailOnly: true }),
    ).resolves.toMatchObject({ kind: 'failed', error: validation });
    expect(h.engine.getPendingSave()?.reason).toBe('validation');
    h.edit();
    h.engine.contentChanged();
    const corrected = h.engine.dispatch('field');
    await h.succeed();
    await corrected;
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].target).toEqual({ status: 'draft', publishedAt: null });
    expect(h.requests[0].command.kind).toBe('field');
  });

  it('retains content while authentication is pending and releases it on disposal', async () => {
    const h = setup();
    const save = h.engine.dispatch('field');
    await h.fail(sessionInvalid);
    expect(h.engine.getPendingSave()?.reason).toBe('reauth');
    h.edit();
    h.engine.contentChanged();
    expect(h.engine.getPendingSave()).toMatchObject({ version: 2, reason: 'reauth' });
    h.engine.dispose();
    await expect(save).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
    expect(h.engine.getPendingSave()).toBeNull();
  });
});
