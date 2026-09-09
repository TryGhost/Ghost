import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, type Deferred } from '@/utils/deferred';
import {
  createSaveEngine,
  type SaveOutcome,
  type SaveRequest,
  type SaveSnapshot,
} from './save-engine';
import { BASE, BASELINE, flush, idleSlug, setup } from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveEngine', () => {
  describe('lifecycle: capture, prepare, execute, reconcile, drain', () => {
    it('reconciles the create response before the queued save runs: one POST, then one PUT with the newest content and the returned updated_at', async () => {
      type Doc = SaveSnapshot & { body: string };
      type Prepared = SaveRequest<Doc> & { method: 'POST' | 'PUT' };
      let doc = { ...BASE, id: null, updatedAt: null, body: 'first' } as Doc;
      const wire: Array<{ method: string; body: string; updatedAt: string | null }> = [];
      const responses: Deferred<SaveOutcome>[] = [];

      const engine = createSaveEngine<Doc, Prepared>({
        getSnapshot: () => doc,
        slug: idleSlug,
        prepare: (request) =>
          Promise.resolve({ ...request, method: request.snapshot.id ? 'PUT' : 'POST' }),
        execute: async (prepared) => {
          wire.push({
            method: prepared.method,
            body: prepared.snapshot.body,
            updatedAt: prepared.snapshot.updatedAt,
          });
          const response = deferred<SaveOutcome>();
          responses.push(response);
          return response.promise;
        },
        reconcile: (prepared, result) => {
          doc = {
            ...doc,
            id: result.id,
            updatedAt: result.updatedAt,
            status: result.status,
            isDirty: doc.version !== prepared.snapshot.version,
          };
        },
      });

      const create = engine.dispatch('explicit');
      await flush();
      doc = { ...doc, body: 'second', version: 2 };
      const autosave = engine.dispatch('autosave');
      expect(wire).toEqual([{ method: 'POST', body: 'first', updatedAt: null }]);

      responses[0].resolve({
        ok: true,
        result: { id: 'post-9', status: 'draft', updatedAt: '2026-09-02T12:00:01.000Z' },
      });
      await flush();
      expect(wire).toEqual([
        { method: 'POST', body: 'first', updatedAt: null },
        { method: 'PUT', body: 'second', updatedAt: '2026-09-02T12:00:01.000Z' },
      ]);

      responses[1].resolve({
        ok: true,
        result: { id: 'post-9', status: 'draft', updatedAt: '2026-09-02T12:00:02.000Z' },
      });
      await flush();
      await expect(create).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'autosave' });
      expect(doc).toMatchObject({
        id: 'post-9',
        updatedAt: '2026-09-02T12:00:02.000Z',
        isDirty: false,
      });
    });

    it('starts IO only after prepare settles', async () => {
      const h = setup();
      const prepared = deferred<SaveRequest>();
      h.prepare.mockReturnValueOnce(prepared.promise);

      void h.engine.dispatch('explicit');
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });
      expect(h.execute).not.toHaveBeenCalled();

      prepared.resolve(h.prepare.mock.calls[0][0]);
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('aborts the in-flight signal on dispose and never reconciles the late response', async () => {
      const h = setup();
      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.signals[0].aborted).toBe(false);

      h.engine.dispose();
      expect(h.signals[0].aborted).toBe(true);
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });

      await h.succeed();
      expect(h.reconcile).not.toHaveBeenCalled();
      expect(h.snapshot.updatedAt).toBe(BASELINE);
      expect(h.engine.getState()).toEqual({ kind: 'disposed' });
    });
  });
});
