import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveEngine, type SaveFailure, type SaveRequest } from './save-engine';
import {
  conflict,
  flush,
  hostLimit,
  notFound,
  setup,
  sessionInvalid,
  transport,
  unknown,
  validation,
} from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function reporting(overrides: Parameters<typeof setup>[0] = {}) {
  const failures: SaveFailure[] = [];
  const h = setup(overrides, { onSaveFailed: (failure) => failures.push(failure) });
  return { ...h, failures };
}

describe('createSaveEngine onSaveFailed', () => {
  it.each([transport, unknown, hostLimit, validation])(
    'reports a $kind failure from execute once, with the request and its timing',
    async (error) => {
      const h = reporting();
      void h.engine.dispatch('explicit');
      await flush();
      vi.advanceTimersByTime(2500);

      await h.fail(error);

      expect(h.failures).toEqual([
        {
          command: { kind: 'explicit', requiresRevision: true, requiresReconfirmation: false },
          error,
          persisted: true,
          durationMs: 2500,
        },
      ]);
    },
  );

  it('reports nothing for a save that succeeds', async () => {
    const h = reporting();
    void h.engine.dispatch('explicit');

    await h.succeed();

    expect(h.failures).toEqual([]);
  });

  it('reports a rejected execute as the unknown failure it became', async () => {
    const h = reporting();
    const cause = new Error('network down');
    void h.engine.dispatch('field');

    await h.reject(cause);

    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({
      command: { kind: 'field' },
      error: { kind: 'unknown', message: 'network down', cause },
    });
  });

  it('reports a not-found with whether the post had an id', async () => {
    const h = reporting({ id: null, updatedAt: null });
    void h.engine.dispatch('autosave');
    await vi.advanceTimersByTimeAsync(3000);

    await h.fail(notFound);

    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({ error: notFound, persisted: false });
  });

  it('reports a collision and not the queued saves it dropped', async () => {
    const h = reporting();
    void h.engine.dispatch('field');
    await flush();
    void h.engine.dispatch('explicit');

    await h.fail(conflict);

    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({ command: { kind: 'field' }, error: conflict });
  });

  it('reports an expired session only once re-authentication is abandoned', async () => {
    const h = reporting();
    void h.engine.dispatch('explicit');
    await flush();
    vi.advanceTimersByTime(400);
    await h.fail(sessionInvalid);
    expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'explicit' });
    expect(h.failures).toEqual([]);

    // The report describes the request as it ran, not the post as it is now.
    h.patch({ id: null, updatedAt: null });
    h.engine.reauthAbandoned();

    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({
      error: sessionInvalid,
      persisted: true,
      durationMs: 400,
    });
  });

  it('reports nothing when re-authentication succeeds and the save is retried', async () => {
    const h = reporting();
    void h.engine.dispatch('explicit');
    await h.fail(sessionInvalid);

    h.engine.reauthSucceeded();
    await h.succeed();

    expect(h.failures).toEqual([]);
  });

  it('reports a prepare failure without a duration, since no request was sent', async () => {
    const h = reporting();
    h.prepare.mockResolvedValueOnce({ ok: false, error: unknown });

    await h.engine.dispatch('explicit');

    expect(h.execute).not.toHaveBeenCalled();
    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({ error: unknown, durationMs: null });
  });

  it('reports a local validation failure for an explicit save but not a held background save', async () => {
    const h = reporting();
    h.prepare.mockResolvedValue({ ok: false, error: validation });

    await expect(h.engine.dispatch('field')).resolves.toEqual({
      kind: 'blocked',
      error: validation,
    });
    expect(h.failures).toEqual([]);

    await h.engine.dispatch('explicit');

    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({ error: validation, durationMs: null });
  });

  it('reports a snapshot that could not be read', async () => {
    const h = reporting();
    const cause = new Error('snapshot exploded');
    h.throwNextSnapshot(cause);

    await h.engine.dispatch('explicit');

    expect(h.failures).toHaveLength(1);
    expect(h.failures[0]).toMatchObject({
      error: { kind: 'unknown', message: 'snapshot exploded', cause },
      persisted: true,
    });
  });

  it('routes a throwing reporter to onListenerError and still settles the save', async () => {
    const h = setup(
      {},
      {
        onSaveFailed: () => {
          throw new Error('reporter down');
        },
      },
    );
    const completion = h.engine.dispatch('explicit');

    await h.fail(transport);

    await expect(completion).resolves.toEqual({
      kind: 'failed',
      error: transport,
      executedAs: 'explicit',
    });
    expect(h.listenerErrors).toEqual([new Error('reporter down')]);
  });

  it('is optional', async () => {
    const engine = createSaveEngine({
      getSnapshot: () => ({
        id: 'post-1',
        updatedAt: '2026-09-02T11:00:00.000Z',
        status: 'draft',
        publishedAt: null,
        title: 'Hello',
        slug: 'hello',
        isDirty: true,
        changedSinceLastRevision: true,
        version: 1,
      }),
      slug: {
        settled: () => Promise.resolve(),
        fromTitle: () => Promise.resolve({ slug: '', source: 'unchanged' }),
      },
      prepare: (request: SaveRequest) => Promise.resolve({ ok: true, prepared: request }),
      execute: () => Promise.resolve({ ok: false, error: transport }),
      reconcile: () => {},
    });

    await expect(engine.dispatch('explicit')).resolves.toMatchObject({ kind: 'failed' });
  });
});
