import { vi } from 'vitest';
import { deferred, type Deferred } from '@/utils/deferred';
import {
  createSaveEngine,
  type DispatchIntent,
  type SaveEngine,
  type SaveEngineState,
  type SaveError,
  type SaveOutcome,
  type SaveRequest,
  type SaveResult,
  type SaveSnapshot,
  type SlugPort,
  type SlugProposal,
} from '@/editor/engine/save-engine';

const NOW = Date.parse('2026-09-02T12:00:00.000Z');
export const FUTURE = '2026-09-03T09:30:00.000Z';
export const PAST = '2026-09-01T09:30:00.000Z';
export const BASELINE = '2026-09-02T11:00:00.000Z';

export const flush = () => vi.advanceTimersByTimeAsync(0);

export type SnapshotFields = Omit<SaveSnapshot, 'id' | 'updatedAt'> & {
  id: string | null;
  updatedAt: string | null;
};

export const BASE: SnapshotFields = {
  id: 'post-1',
  updatedAt: BASELINE,
  status: 'draft',
  publishedAt: null,
  title: 'Hello',
  slug: 'hello',
  isDirty: true,
  changedSinceLastRevision: true,
  version: 1,
};

export const idleSlug: SlugPort = {
  settled: () => Promise.resolve(),
  fromTitle: () => Promise.resolve({ slug: '', source: 'unchanged' }),
};

export function dispatchAny(engine: SaveEngine, kind: DispatchIntent) {
  switch (kind) {
    case 'schedule':
      return engine.dispatch('schedule', { publishedAt: FUTURE });
    case 'publish':
      return engine.dispatch('publish');
    default:
      return engine.dispatch(kind);
  }
}

export function setup(overrides: Partial<SnapshotFields> = {}) {
  let snapshot = { ...BASE, ...overrides } as SaveSnapshot;
  const requests: SaveRequest[] = [];
  const signals: AbortSignal[] = [];
  const outstanding: Deferred<SaveOutcome>[] = [];
  const states: SaveEngineState[] = [];
  const listenerErrors: unknown[] = [];
  const slugRequests: Array<{
    title: string;
    postId: string | null;
    outcome: Deferred<SlugProposal>;
  }> = [];
  let concurrent = 0;
  let maxConcurrent = 0;
  let snapshotError: Error | null = null;
  let slugSettled: Deferred<void> | null = null;
  let holdSlugRequests = false;
  let sequence = 0;

  // Answers "unchanged" immediately unless a test holds the requests to answer them itself.
  const slug: SlugPort = {
    settled: vi.fn(() => (slugSettled ? slugSettled.promise : Promise.resolve())),
    fromTitle: vi.fn((title: string, postId: string | null) => {
      if (!holdSlugRequests) {
        return Promise.resolve<SlugProposal>({ slug: snapshot.slug, source: 'unchanged' });
      }
      const outcome = deferred<SlugProposal>();
      slugRequests.push({ title, postId, outcome });
      return outcome.promise;
    }),
  };

  const prepare = vi.fn((request: SaveRequest) => Promise.resolve(request));

  const execute = vi.fn(async (prepared: SaveRequest, signal: AbortSignal) => {
    requests.push(prepared);
    signals.push(signal);
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    const outcome = deferred<SaveOutcome>();
    outstanding.push(outcome);
    try {
      return await outcome.promise;
    } finally {
      concurrent -= 1;
    }
  });

  // Adopts the response; edits made after the request left keep the post dirty.
  const reconcile = vi.fn((prepared: SaveRequest, result: SaveResult) => {
    const editedInFlight = snapshot.version !== prepared.snapshot.version;
    snapshot = {
      ...snapshot,
      id: result.id,
      updatedAt: result.updatedAt,
      status: result.status,
      publishedAt: prepared.target.publishedAt,
      slug: prepared.slug,
      isDirty: editedInFlight,
    };
  });

  const engine = createSaveEngine({
    getSnapshot: () => {
      if (snapshotError) {
        const error = snapshotError;
        snapshotError = null;
        throw error;
      }
      return snapshot;
    },
    slug,
    prepare,
    execute,
    reconcile,
    onStateChange: (state) => states.push(state),
    onListenerError: (error) => listenerErrors.push(error),
  });

  function nextRequest() {
    return requests[requests.length - outstanding.length];
  }

  return {
    engine,
    execute,
    prepare,
    reconcile,
    slug,
    slugRequests,
    requests,
    signals,
    states,
    listenerErrors,
    nextRequest,
    get snapshot() {
      return snapshot;
    },
    maxConcurrent: () => maxConcurrent,
    patch(changes: Partial<SnapshotFields>) {
      snapshot = { ...snapshot, ...changes } as SaveSnapshot;
    },
    edit() {
      snapshot = { ...snapshot, isDirty: true, version: snapshot.version + 1 };
    },
    throwNextSnapshot(error: Error) {
      snapshotError = error;
    },
    holdSlugWork() {
      slugSettled = deferred<void>();
      return async () => {
        slugSettled?.resolve();
        slugSettled = null;
        await flush();
      };
    },
    holdSlugRequests() {
      holdSlugRequests = true;
    },
    async resolveSlug(value: string, source: SlugProposal['source'] = 'generated') {
      slugRequests.shift()!.outcome.resolve({ slug: value, source });
      await flush();
    },
    // Each of these lets the prepare stage reach execute before answering the request.
    async succeed(result: Partial<SaveResult> = {}) {
      await flush();
      const request = nextRequest();
      const outcome = outstanding.shift()!;
      sequence += 1;
      outcome.resolve({
        ok: true,
        result: {
          id: request.snapshot.id ?? 'post-1',
          status: request.target.status,
          updatedAt: new Date(NOW + sequence * 1000).toISOString(),
          ...result,
        },
      });
      await flush();
    },
    async fail(error: SaveError) {
      await flush();
      outstanding.shift()!.resolve({ ok: false, error });
      await flush();
    },
    async reject(cause: unknown) {
      await flush();
      outstanding.shift()!.reject(cause);
      await flush();
    },
  };
}

export type Harness = ReturnType<typeof setup>;

export const validation: SaveError = { kind: 'validation', message: 'Title is too long' };
export const hostLimit: SaveError = { kind: 'host-limit', message: 'Upgrade required' };
export const transport: SaveError = { kind: 'transport', message: 'Server unreachable' };
export const sessionInvalid: SaveError = { kind: 'session-invalid', message: 'Unauthorized' };
export const notFound: SaveError = { kind: 'not-found', message: 'Post not found' };
export const conflict: SaveError = {
  kind: 'conflict',
  message: 'Someone else is editing this post',
};
export const unknown: SaveError = { kind: 'unknown', message: 'Boom' };
