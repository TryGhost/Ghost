import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, type Deferred } from '@/utils/deferred';
import {
  AUTOSAVE_DEBOUNCE_MS,
  createSaveEngine,
  DEFAULT_TITLE,
  deriveTarget,
  resolveTarget,
  TIMED_SAVE_INTERVAL_MS,
  zeroMilliseconds,
  type DispatchIntent,
  type PostStatus,
  type SaveCommand,
  type SaveEngine,
  type SaveEngineState,
  type SaveError,
  type SaveOutcome,
  type SaveRequest,
  type SaveResult,
  type SaveSnapshot,
  type SaveTarget,
  type SlugPort,
  type SlugProposal,
} from './save-engine';

const NOW = Date.parse('2026-09-02T12:00:00.000Z');
const FUTURE = '2026-09-03T09:30:00.000Z';
const PAST = '2026-09-01T09:30:00.000Z';
const BASELINE = '2026-09-02T11:00:00.000Z';

const flush = () => vi.advanceTimersByTimeAsync(0);

type SnapshotFields = Omit<SaveSnapshot, 'id' | 'updatedAt'> & {
  id: string | null;
  updatedAt: string | null;
};

const BASE: SnapshotFields = {
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

const idleSlug: SlugPort = {
  settled: () => Promise.resolve(),
  fromTitle: () => Promise.resolve({ slug: '', source: 'unchanged' }),
};

function dispatchAny(engine: SaveEngine, kind: DispatchIntent) {
  switch (kind) {
    case 'schedule':
      return engine.dispatch('schedule', { publishedAt: FUTURE });
    case 'publish':
      return engine.dispatch('publish');
    default:
      return engine.dispatch(kind);
  }
}

function setup(overrides: Partial<SnapshotFields> = {}) {
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

type Harness = ReturnType<typeof setup>;

const validation: SaveError = { kind: 'validation', message: 'Title is too long' };
const hostLimit: SaveError = { kind: 'host-limit', message: 'Upgrade required' };
const transport: SaveError = { kind: 'transport', message: 'Server unreachable' };
const sessionInvalid: SaveError = { kind: 'session-invalid', message: 'Unauthorized' };
const notFound: SaveError = { kind: 'not-found', message: 'Post not found' };
const conflict: SaveError = { kind: 'conflict', message: 'Someone else is editing this post' };
const unknown: SaveError = { kind: 'unknown', message: 'Boom' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('deriveTarget', () => {
  it('publishes now and keeps the post’s existing publish time unless told otherwise', () => {
    expect(deriveTarget('publish', { status: 'draft', publishedAt: null })).toEqual({
      status: 'published',
      publishedAt: null,
    });
    expect(
      deriveTarget('publish', { status: 'draft', publishedAt: '2026-09-01T09:30:15.789Z' }),
    ).toEqual({ status: 'published', publishedAt: '2026-09-01T09:30:15.000Z' });
    expect(
      deriveTarget('publish', { status: 'draft', publishedAt: PAST }, { publishedAt: null }),
    ).toEqual({ status: 'published', publishedAt: null });
  });

  it('carries email extras only when the flow provides them', () => {
    expect(
      deriveTarget(
        'publish',
        { status: 'draft', publishedAt: null },
        { emailOnly: true, newsletter: 'weekly', emailSegment: 'status:free' },
      ),
    ).toEqual({
      status: 'published',
      publishedAt: null,
      emailOnly: true,
      newsletter: 'weekly',
      emailSegment: 'status:free',
    });
  });

  it('schedules with a zeroed publish time', () => {
    expect(
      deriveTarget(
        'schedule',
        { status: 'draft', publishedAt: null },
        { publishedAt: '2026-09-03T09:30:15.789Z' },
      ),
    ).toEqual({ status: 'scheduled', publishedAt: '2026-09-03T09:30:15.000Z' });
  });

  it('unschedules to a draft with no publish time', () => {
    expect(deriveTarget('revert', { status: 'scheduled', publishedAt: FUTURE })).toEqual({
      status: 'draft',
      publishedAt: null,
      emailOnly: false,
    });
  });

  it.each<PostStatus>(['published', 'sent'])(
    'unpublishes a %s post to a draft that keeps its historical publish time',
    (status) => {
      expect(deriveTarget('revert', { status, publishedAt: PAST })).toEqual({
        status: 'draft',
        publishedAt: PAST,
        emailOnly: false,
      });
    },
  );
});

describe('resolveTarget', () => {
  const command = (kind: SaveCommand['kind']): SaveCommand => ({
    kind,
    requiresRevision: false,
    requiresReconfirmation: false,
  });

  it.each<SaveCommand['kind']>(['autosave', 'timed', 'field'])(
    '%s pins the status to draft and leaves the publish time alone',
    (kind) => {
      expect(resolveTarget(command(kind), { status: 'draft', publishedAt: PAST })).toEqual({
        status: 'draft',
        publishedAt: PAST,
      });
    },
  );

  it.each<[SaveCommand['kind'], PostStatus, string | null]>([
    ['explicit', 'draft', null],
    ['explicit', 'published', PAST],
    ['explicit', 'scheduled', FUTURE],
    ['explicit', 'scheduled', PAST],
    ['explicit', 'sent', PAST],
    ['leave', 'published', PAST],
    ['leave', 'draft', null],
  ])('%s on a %s post preserves the status', (kind, status, publishedAt) => {
    expect(resolveTarget(command(kind), { status, publishedAt })).toEqual({
      status,
      publishedAt,
    });
  });

  it('returns a captured target untouched', () => {
    const target: SaveTarget = { status: 'scheduled', publishedAt: FUTURE, newsletter: 'weekly' };
    expect(
      resolveTarget({ ...command('schedule'), target }, { status: 'published', publishedAt: PAST }),
    ).toBe(target);
  });
});

describe('zeroMilliseconds', () => {
  it('drops milliseconds and leaves everything else untouched', () => {
    expect(zeroMilliseconds('2026-09-03T09:30:15.789Z')).toBe('2026-09-03T09:30:15.000Z');
    expect(zeroMilliseconds(null)).toBeNull();
    expect(zeroMilliseconds('not a date')).toBe('not a date');
  });
});

describe('createSaveEngine', () => {
  describe('invariant 1: background saves never change status', () => {
    it('persists a field change on a draft pinned to draft without a revision', async () => {
      const h = setup({ publishedAt: PAST });

      void h.engine.dispatch('field');
      await flush();

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'field', requiresRevision: false },
        target: { status: 'draft', publishedAt: PAST },
        saveRevision: false,
      });
    });

    it.each<PostStatus>(['published', 'scheduled', 'sent'])(
      'drops field and autosave intents for a %s post with a typed reason',
      async (status) => {
        const h = setup({ status, publishedAt: FUTURE });

        const completions = await Promise.all([
          h.engine.dispatch('autosave'),
          h.engine.dispatch('field'),
        ]);
        await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS + AUTOSAVE_DEBOUNCE_MS);

        expect(completions).toEqual(Array(2).fill({ kind: 'dropped', reason: 'not-draft' }));
        expect(h.execute).not.toHaveBeenCalled();
      },
    );

    it('drops a pending background save once the in-flight save has published the post', async () => {
      const h = setup();
      const publish = h.engine.dispatch('publish');
      const field = h.engine.dispatch('field');

      await h.succeed();

      expect(h.snapshot.status).toBe('published');
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'not-draft' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('invariant 2: single flight, payload built at execution time, coalescing loses nothing', () => {
    it('runs one save at a time and builds each payload from the snapshot current at execution', async () => {
      const h = setup();
      const first = h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const second = h.engine.dispatch('field');
      h.edit();
      const third = h.engine.dispatch('explicit');

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'explicit',
      });
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'explicit' },
        snapshot: { version: 3 },
      });

      await h.succeed();
      await expect(first).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(second).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(third).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      expect(h.maxConcurrent()).toBe(1);
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('restarts the autosave debounce on every edit and fires once, 3s after the last one', async () => {
      const h = setup();

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(2000);
      h.edit();
      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(2000);
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'debouncing' });

      await vi.advanceTimersByTimeAsync(1000);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { version: 2 },
      });
    });
  });

  describe('invariant 3: session expiry loses nothing', () => {
    it('freezes the queue on 401 and re-dispatches the failed save after re-authentication', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'autosave' });

      h.edit();
      const laterAutosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'autosave' });

      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
      await expect(laterAutosave).resolves.toMatchObject({ kind: 'saved' });
      expect(h.snapshot.isDirty).toBe(false);
    });

    it('lets a higher-priority intent queued during re-auth carry the frozen save', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);

      const explicit = h.engine.dispatch('explicit');
      expect(h.execute).toHaveBeenCalledTimes(1);

      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'explicit' }, saveRevision: true });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(field).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
    });

    it('ignores reauthSucceeded when nothing is waiting on re-authentication', async () => {
      const h = setup();
      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('asks for confirmation instead of enqueueing a leave save while re-auth is pending', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      await h.fail(sessionInvalid);

      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('invariant 4: save-on-leave fires at most once and only for dirty drafts', () => {
    it('saves a dirty draft with unrevisioned changes exactly once, with a revision, then proceeds', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'leave' },
        target: { status: 'draft' },
        saveRevision: true,
      });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('proceeds without saving when the post is clean', async () => {
      const h = setup({ isDirty: false });
      await expect(h.engine.leaveRequested()).resolves.toBe('proceed');
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('never saves a dirty published post on leave and asks for confirmation', async () => {
      const h = setup({ status: 'published', publishedAt: PAST });
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('cancels an armed autosave and saves once for an already-revisioned dirty draft', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('autosave');

      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' }, saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('does not save a second time in the same leave attempt when the first leave save failed', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();
      h.edit();
      void h.engine.dispatch('autosave');

      await h.fail(transport);
      await expect(decision).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('invariant 6: a failed save keeps the post dirty and recoverable', () => {
    it.each([validation, hostLimit, transport, unknown])(
      'surfaces a $kind error to the dispatcher and still runs the pending explicit save',
      async (error) => {
        const h = setup();
        const failing = h.engine.dispatch('field');
        const explicit = h.engine.dispatch('explicit');

        await h.fail(error);
        await expect(failing).resolves.toEqual({ kind: 'failed', error, executedAs: 'field' });
        expect(h.snapshot.isDirty).toBe(true);
        expect(h.execute).toHaveBeenCalledTimes(2);
        expect(h.requests[1]).toMatchObject({ command: { kind: 'explicit' } });

        await h.succeed();
        await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
      },
    );

    it('reports an error state until the next save starts', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);
      expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error: transport });

      void h.engine.dispatch('explicit');
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });
    });

    it('treats a rejected execute as an unknown error rather than swallowing it', async () => {
      const h = setup();
      const completion = h.engine.dispatch('explicit');
      const cause = new Error('network down');

      await h.reject(cause);

      await expect(completion).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'network down', cause },
        executedAs: 'explicit',
      });
    });

    it('treats a rejected prepare as an unknown error before any IO starts', async () => {
      const h = setup();
      const cause = new Error('invalid candidate');
      h.prepare.mockRejectedValueOnce(cause);

      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'invalid candidate', cause },
        executedAs: 'explicit',
      });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toMatchObject({ kind: 'error', intent: 'explicit' });
    });
  });

  describe('invariant 7: only explicit and leave saves set save_revision', () => {
    it.each<[DispatchIntent, boolean]>([
      ['explicit', true],
      ['leave', true],
      ['autosave', false],
      ['field', false],
      ['publish', false],
      ['schedule', false],
      ['revert', false],
    ])('%s requests save_revision=%s', async (intent, saveRevision) => {
      const h = setup();
      void dispatchAny(h.engine, intent);
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({ command: { kind: intent }, saveRevision });
    });

    it('ORs the revision requirement across coalesced work', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      const explicit = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'publish', requiresRevision: true },
        saveRevision: true,
      });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
    });
  });

  describe('invariant 10: scheduled saves zero milliseconds and preserve the publish time', () => {
    it('serializes a future scheduled post with a zeroed publish time across saves', async () => {
      const h = setup({ status: 'scheduled', publishedAt: '2026-09-03T09:30:15.789Z' });

      void h.engine.dispatch('explicit');
      await h.succeed();
      void h.engine.dispatch('explicit');
      await h.succeed();

      expect(h.requests).toHaveLength(2);
      for (const request of h.requests) {
        expect(request).toMatchObject({
          target: { status: 'scheduled', publishedAt: '2026-09-03T09:30:15.000Z' },
        });
      }
    });

    it('preserves a past scheduled time on an explicit save and leaves the transition to the server', async () => {
      const h = setup({ status: 'scheduled', publishedAt: PAST });
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.requests[0]).toMatchObject({ target: { status: 'scheduled', publishedAt: PAST } });
    });
  });

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

  describe('prepare stage: title and slug', () => {
    it('serializes an explicit save behind manual slug work in progress', async () => {
      const h = setup();
      const release = h.holdSlugWork();

      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });
      expect(h.execute).not.toHaveBeenCalled();

      await release();
      expect(h.execute).toHaveBeenCalledTimes(1);
      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
    });

    it('waits for a slow slug request before a leave save leaves', async () => {
      const h = setup({ slug: '' });
      h.holdSlugRequests();
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith('Hello', 'post-1', expect.any(AbortSignal));
      expect(h.execute).not.toHaveBeenCalled();

      await h.resolveSlug('hello');
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' }, slug: 'hello' });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('creates a titleless body-first post as (Untitled) with a generated slug', async () => {
      const h = setup({ id: null, updatedAt: null, title: '', slug: '' });
      h.holdSlugRequests();
      void h.engine.dispatch('autosave');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith(DEFAULT_TITLE, null, expect.any(AbortSignal));

      await h.resolveSlug('untitled');
      expect(h.requests[0]).toMatchObject({
        title: DEFAULT_TITLE,
        slug: 'untitled',
        target: { status: 'draft' },
        snapshot: { id: null, title: '' },
      });
    });

    it('treats a whitespace title as blank', async () => {
      const h = setup({ id: null, updatedAt: null, title: '   ', slug: '' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith(DEFAULT_TITLE, null, expect.any(AbortSignal));

      await h.resolveSlug('untitled');
      expect(h.requests[0]).toMatchObject({ title: DEFAULT_TITLE, slug: 'untitled' });
    });

    it('applies a generated proposal requested with the post id', async () => {
      const h = setup({ title: 'Hello world' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith(
        'Hello world',
        'post-1',
        expect.any(AbortSignal),
      );

      await h.resolveSlug('hello-world-2');
      expect(h.requests[0]).toMatchObject({ slug: 'hello-world-2', snapshot: { id: 'post-1' } });
      await h.succeed();
      expect(h.snapshot.slug).toBe('hello-world-2');
    });

    it('sends the slug current after an unchanged answer, not the one read before the request', async () => {
      const h = setup({ slug: 'my-slug' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();

      h.patch({ slug: 'my-custom-slug' });
      await h.resolveSlug('ignored', 'unchanged');
      expect(h.requests[0]).toMatchObject({
        slug: 'my-custom-slug',
        snapshot: { slug: 'my-custom-slug' },
      });
    });

    it('asks the slug port on every draft save and lets it keep the slug', async () => {
      const h = setup({ title: '' });
      void h.engine.dispatch('explicit');
      await flush();

      expect(h.slug.fromTitle).toHaveBeenCalledWith(
        DEFAULT_TITLE,
        'post-1',
        expect.any(AbortSignal),
      );
      expect(h.requests[0]).toMatchObject({ title: DEFAULT_TITLE, slug: 'hello' });
    });

    it('never asks for a slug when a non-draft post already has one', async () => {
      const h = setup({ status: 'published', publishedAt: PAST, title: 'Renamed' });
      void h.engine.dispatch('explicit');
      await flush();

      expect(h.slug.fromTitle).not.toHaveBeenCalled();
      expect(h.requests[0]).toMatchObject({ slug: 'hello' });
    });

    it('asks for a slug for a post of any status that has none', async () => {
      const h = setup({ status: 'published', publishedAt: PAST, slug: '' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();

      expect(h.slug.fromTitle).toHaveBeenCalledWith('Hello', 'post-1', expect.any(AbortSignal));
      await h.resolveSlug('hello');
      expect(h.requests[0]).toMatchObject({ slug: 'hello' });
    });

    it('drops a background save whose post was published during the slug request', async () => {
      const h = setup();
      h.holdSlugRequests();
      const field = h.engine.dispatch('field');
      await flush();

      h.patch({ status: 'published', publishedAt: PAST, updatedAt: FUTURE });
      await h.resolveSlug('hello', 'unchanged');
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'not-draft' });
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('drops a background save whose post went clean during the slug request', async () => {
      const h = setup();
      h.holdSlugRequests();
      const field = h.engine.dispatch('field');
      await flush();

      h.patch({ isDirty: false });
      await h.resolveSlug('hello', 'unchanged');
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('never prepares a save disposed while slug work was settling', async () => {
      const h = setup();
      const release = h.holdSlugWork();
      const explicit = h.engine.dispatch('explicit');
      await flush();

      h.engine.dispose();
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
      await release();
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('never prepares a save disposed while a slug proposal was pending', async () => {
      const h = setup();
      h.holdSlugRequests();
      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledTimes(1);

      h.engine.dispose();
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
      await h.resolveSlug('late');
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
    });
  });

  describe('commands: captured at dispatch', () => {
    it('captures a schedule target that a response resync cannot turn into a publish', async () => {
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('explicit');
      await flush();
      const schedule = h.engine.dispatch('schedule', { publishedAt: FUTURE });
      h.patch({ publishedAt: PAST });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'schedule', target: { status: 'scheduled', publishedAt: FUTURE } },
        target: { status: 'scheduled', publishedAt: FUTURE },
        snapshot: { id: 'post-1', publishedAt: null },
      });

      await h.succeed();
      await expect(schedule).resolves.toMatchObject({ kind: 'saved', executedAs: 'schedule' });
    });

    it('attaches email extras to exactly the publish request', async () => {
      const h = setup();
      void h.engine.dispatch('publish', { newsletter: 'weekly', emailSegment: 'all' });
      const explicit = h.engine.dispatch('explicit');

      await h.succeed();
      expect(h.requests[0].target).toEqual({
        status: 'published',
        publishedAt: null,
        newsletter: 'weekly',
        emailSegment: 'all',
      });
      expect(h.requests[1].target).toEqual({ status: 'published', publishedAt: null });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
    });

    it('disarms a failed publish: the next explicit save preserves the draft status', async () => {
      const h = setup();
      const publish = h.engine.dispatch('publish', { newsletter: 'weekly' });
      await h.fail(transport);
      await expect(publish).resolves.toEqual({
        kind: 'failed',
        error: transport,
        executedAs: 'publish',
      });

      void h.engine.dispatch('explicit');
      await flush();
      expect(h.requests[1].target).toEqual({ status: 'draft', publishedAt: null });
    });

    it('unschedules to a draft with no publish time', async () => {
      const h = setup({ status: 'scheduled', publishedAt: FUTURE });
      void h.engine.dispatch('revert');
      await flush();
      expect(h.requests[0].target).toEqual({
        status: 'draft',
        publishedAt: null,
        emailOnly: false,
      });
    });

    it('unpublishes to a draft that keeps its historical publish time', async () => {
      const h = setup({ status: 'published', publishedAt: PAST });
      void h.engine.dispatch('revert');
      await flush();
      expect(h.requests[0].target).toEqual({
        status: 'draft',
        publishedAt: PAST,
        emailOnly: false,
      });
    });

    it.each<PostStatus>(['published', 'scheduled', 'sent'])(
      'preserves the %s status on an explicit save',
      async (status) => {
        const h = setup({ status, publishedAt: status === 'scheduled' ? FUTURE : PAST });
        void h.engine.dispatch('explicit');
        await flush();
        expect(h.requests[0].target.status).toBe(status);
      },
    );
  });

  describe('interleavings', () => {
    it('saves a new post immediately on its first edit', async () => {
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('autosave');
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'autosave' });
      await flush();

      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'autosave' },
        target: { status: 'draft' },
        snapshot: { id: null },
      });
    });

    it('coalesces an autosave arriving during an in-flight create and rebuilds its payload', async () => {
      const h = setup({ id: null, updatedAt: null });
      const create = h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'autosave',
      });
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { id: 'post-1', version: 2 },
      });

      await h.succeed();
      await expect(create).resolves.toMatchObject({ kind: 'saved' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
    });

    it('coalesces a debounced autosave that fires during a slow explicit save', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await flush();
      h.edit();
      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'autosave',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { version: 2 },
      });
    });

    it('lets an explicit save cancel a pending autosave debounce and supersede it', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(1000);

      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({ command: { kind: 'explicit' } });

      await h.succeed();
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
    });

    it('waits for an in-flight save on leave, then saves once with a revision', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'leave' }, saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('lets publish win the pending slot over a queued autosave', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'field',
        pending: 'autosave',
      });

      const publish = h.engine.dispatch('publish');
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'field',
        pending: 'publish',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'publish' },
        target: { status: 'published' },
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('halts permanently on a 404 for a known post id', async () => {
      const h = setup();
      const failing = h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      await h.fail(notFound);
      expect(h.engine.getState()).toEqual({ kind: 'halted' });
      await expect(failing).resolves.toEqual({
        kind: 'failed',
        error: notFound,
        executedAs: 'explicit',
      });
      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'halted' });

      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
      await expect(h.engine.dispatch('autosave')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
    });

    it('crashes on a 404 for a post that has no id yet', async () => {
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('explicit');

      await h.fail(notFound);
      expect(h.engine.getState()).toEqual({ kind: 'crashed' });
      await expect(h.engine.dispatch('field')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
    });

    it.each([validation, hostLimit])(
      'suppresses background saves after a $kind error on a draft save until the snapshot changes',
      async (error) => {
        const h = setup();
        void h.engine.dispatch('explicit');
        await h.fail(error);
        expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error });

        await expect(h.engine.dispatch('autosave')).resolves.toEqual({
          kind: 'dropped',
          reason: 'suppressed',
        });
        await expect(h.engine.dispatch('field')).resolves.toEqual({
          kind: 'dropped',
          reason: 'suppressed',
        });
        await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
        expect(h.execute).toHaveBeenCalledTimes(1);

        void h.engine.dispatch('explicit');
        await flush();
        expect(h.execute).toHaveBeenCalledTimes(2);
        await h.fail(error);

        h.edit();
        void h.engine.dispatch('autosave');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(h.execute).toHaveBeenCalledTimes(3);
        expect(h.requests[2]).toMatchObject({
          command: { kind: 'autosave' },
          snapshot: { version: 2 },
        });
      },
    );

    it('scopes host-limit suppression to the failing operation: a publish limit never halts autosave', async () => {
      const h = setup();
      const publish = h.engine.dispatch('publish');
      await h.fail(hostLimit);
      await expect(publish).resolves.toMatchObject({ kind: 'failed', error: hostLimit });

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'autosave' } });
    });

    it('keeps autosaving after a transport error', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'autosave' } });
    });

    it('forces a timed save after 60s of continuous editing', async () => {
      const h = setup();
      const autosaves: Promise<unknown>[] = [];
      for (let second = 0; second < 60; second += 1) {
        h.edit();
        autosaves.push(h.engine.dispatch('autosave'));
        await vi.advanceTimersByTimeAsync(1000);
      }

      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'timed' },
        target: { status: 'draft' },
        saveRevision: false,
        snapshot: { version: 61 },
      });

      await h.succeed();
      const completions = await Promise.all(autosaves);
      expect(completions).toHaveLength(60);
      for (const completion of completions) {
        expect(completion).toMatchObject({ kind: 'saved', executedAs: 'timed' });
      }
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('skips a background save that finds the post clean at execution time', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      h.patch({ isDirty: false });
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('skips a background save that finds the post clean after slug work settled', async () => {
      const h = setup();
      const release = h.holdSlugWork();
      const field = h.engine.dispatch('field');
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'field' });

      h.patch({ isDirty: false });
      await release();
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('notifies subscribers of every transition until they unsubscribe', async () => {
      const h = setup();
      const seen: SaveEngineState[] = [];
      const unsubscribe = h.engine.subscribe((state) => seen.push(state));

      void h.engine.dispatch('explicit');
      await h.succeed();
      expect(seen).toEqual([{ kind: 'saving', intent: 'explicit' }, { kind: 'idle' }]);
      expect(h.states).toEqual(seen);

      unsubscribe();
      void h.engine.dispatch('explicit');
      expect(seen).toHaveLength(2);
    });

    it('dispose cancels timers and settles every outstanding dispatch', async () => {
      const h = setup();
      const explicit = h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      h.engine.dispose();
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });

      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'dropped',
        reason: 'disposed',
      });
      await expect(h.engine.leaveRequested()).resolves.toBe('proceed');
      expect(h.engine.getState()).toEqual({ kind: 'disposed' });
    });
  });

  describe('collisions', () => {
    // Two engines over the same post; the fake server accepts only the updated_at it last returned.
    it('gives the second writer a typed conflict that halts its automatic saves until it reloads', async () => {
      const server = { updatedAt: BASELINE };
      async function respond(h: Harness) {
        await flush();
        if (h.nextRequest().snapshot.updatedAt !== server.updatedAt) {
          await h.fail(conflict);
          return;
        }
        server.updatedAt = new Date(Date.parse(server.updatedAt) + 60000).toISOString();
        await h.succeed({ updatedAt: server.updatedAt });
      }
      const first = setup();
      const second = setup();

      void first.engine.dispatch('explicit');
      await respond(first);
      expect(first.snapshot.updatedAt).toBe(server.updatedAt);

      const explicit = second.engine.dispatch('explicit');
      await respond(second);
      await expect(explicit).resolves.toEqual({
        kind: 'failed',
        error: conflict,
        executedAs: 'explicit',
      });
      expect(second.engine.getState()).toEqual({
        kind: 'conflict',
        intent: 'explicit',
        error: conflict,
      });
      expect(second.snapshot).toMatchObject({ isDirty: true, updatedAt: BASELINE });

      await expect(second.engine.dispatch('autosave')).resolves.toEqual({
        kind: 'dropped',
        reason: 'conflict',
      });
      await expect(second.engine.dispatch('field')).resolves.toEqual({
        kind: 'dropped',
        reason: 'conflict',
      });
      await expect(second.engine.leaveRequested()).resolves.toBe('confirm');

      const retry = second.engine.dispatch('explicit');
      await flush();
      expect(second.execute).toHaveBeenCalledTimes(2);
      await respond(second);
      await expect(retry).resolves.toMatchObject({ kind: 'failed', error: conflict });

      second.patch({ updatedAt: server.updatedAt });
      void second.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(second.execute).toHaveBeenCalledTimes(3);
      await respond(second);
      expect(second.engine.getState()).toEqual({ kind: 'idle' });
      expect(second.snapshot).toMatchObject({ isDirty: false, updatedAt: server.updatedAt });
    });

    it('drops queued background work on a conflict and keeps the content dirty', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      await h.fail(conflict);
      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'conflict' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.snapshot).toMatchObject({ isDirty: true, version: 2 });
    });

    it('never auto-retries a pending explicit save against the stale baseline', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      const explicit = h.engine.dispatch('explicit');

      await h.fail(conflict);
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'conflict' });
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.engine.getState()).toEqual({ kind: 'conflict', intent: 'field', error: conflict });

      void h.engine.dispatch('explicit');
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('drains a publish with the updated_at the preceding save reconciled', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      const publish = h.engine.dispatch('publish');

      await h.succeed({ updatedAt: '2026-09-02T12:30:00.000Z' });
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'publish' },
        snapshot: { updatedAt: '2026-09-02T12:30:00.000Z' },
      });

      await h.succeed();
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
    });

    it('fails a past-scheduled explicit save whose changed publish time the server rejects', async () => {
      const h = setup({ status: 'scheduled', publishedAt: PAST });
      const explicit = h.engine.dispatch('explicit');
      await h.fail(validation);

      await expect(explicit).resolves.toEqual({
        kind: 'failed',
        error: validation,
        executedAs: 'explicit',
      });
      expect(h.snapshot).toMatchObject({ isDirty: true, status: 'scheduled', publishedAt: PAST });
      expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error: validation });
    });
  });

  describe('leave outcomes', () => {
    it('asks for confirmation when the in-flight save it waited for fails', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();

      await h.fail(transport);
      await expect(decision).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('re-reads the post after the in-flight save and asks for confirmation when it is still dirty', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();

      h.edit();
      await h.succeed();
      expect(h.snapshot.isDirty).toBe(true);
      await expect(decision).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('asks for confirmation when the leave save replacing an armed autosave fails', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('autosave');
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' } });

      await h.fail(transport);
      await expect(decision).resolves.toBe('confirm');
    });

    it('shares one leave save across concurrent leave requests', async () => {
      const h = setup();
      const first = h.engine.leaveRequested();
      const second = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      await expect(first).resolves.toBe('proceed');
      await expect(second).resolves.toBe('proceed');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('re-runs a leave save interrupted by re-auth and then proceeds', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'leave' });

      h.engine.reauthSucceeded();
      await flush();
      expect(h.requests[1]).toMatchObject({ command: { kind: 'leave' }, saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('asks for confirmation when re-auth is abandoned during a leave save', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();
      await h.fail(sessionInvalid);

      h.engine.reauthAbandoned();
      await expect(decision).resolves.toBe('confirm');
      expect(h.engine.getState()).toEqual({
        kind: 'error',
        intent: 'leave',
        error: sessionInvalid,
      });
    });
  });

  describe('re-auth outcomes', () => {
    it.each<DispatchIntent>(['publish', 'schedule', 'revert'])(
      'never auto-fires a %s after re-auth; it resolves needs-retry',
      async (intent) => {
        const h = setup(intent === 'revert' ? { status: 'published', publishedAt: PAST } : {});
        const completion = dispatchAny(h.engine, intent);
        await h.fail(sessionInvalid);

        h.engine.reauthSucceeded();
        await flush();
        await expect(completion).resolves.toEqual({ kind: 'needs-retry' });
        expect(h.execute).toHaveBeenCalledTimes(1);

        // A dirty draft resumes autosaving on its own; a published post has nothing to resume.
        if (intent === 'revert') {
          expect(h.engine.getState()).toEqual({ kind: 'idle' });
          await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
          expect(h.execute).toHaveBeenCalledTimes(1);
        } else {
          expect(h.engine.getState()).toEqual({ kind: 'debouncing' });
          await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
          expect(h.execute).toHaveBeenCalledTimes(2);
          expect(h.requests[1]).toMatchObject({
            command: { kind: 'autosave' },
            target: { status: 'draft' },
          });
        }
      },
    );

    it('never auto-fires a publish queued while a background save was frozen', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);
      const publish = h.engine.dispatch('publish', { newsletter: 'weekly' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'field' },
        target: { status: 'draft', publishedAt: null },
      });

      await h.succeed();
      await expect(field).resolves.toMatchObject({ kind: 'saved', executedAs: 'field' });
      expect(h.snapshot.status).toBe('draft');
    });

    it('re-runs a frozen explicit rider on its own but never the publish it coalesced into', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      const rider = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');
      await h.succeed();
      expect(h.requests[1]).toMatchObject({ command: { kind: 'publish' }, saveRevision: true });

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'publish' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(3);
      expect(h.requests[2]).toMatchObject({
        command: { kind: 'explicit' },
        target: { status: 'draft' },
        saveRevision: true,
      });

      await h.succeed();
      await expect(rider).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
    });

    it('judges re-auth by the resolved effect: a frozen revert whose post is already a draft re-runs', async () => {
      const h = setup({ status: 'published', publishedAt: PAST });
      const revert = h.engine.dispatch('revert');
      await h.fail(sessionInvalid);

      h.patch({ status: 'draft' });
      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'revert' },
        target: { status: 'draft', publishedAt: PAST },
      });

      await h.succeed();
      await expect(revert).resolves.toMatchObject({ kind: 'saved', executedAs: 'revert' });
    });

    it('never double-creates a new post whose publish needs retry after re-auth', async () => {
      const h = setup({ id: null, updatedAt: null });
      const publish = h.engine.dispatch('publish');
      await h.fail(sessionInvalid);
      const explicit = h.engine.dispatch('explicit');

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'explicit' },
        target: { status: 'draft' },
        snapshot: { id: null },
      });
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.maxConcurrent()).toBe(1);
    });

    it('resumes a new post’s autosave after a failed publish without a concurrent create', async () => {
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('publish');
      await h.fail(sessionInvalid);

      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        target: { status: 'draft' },
      });

      await h.succeed();
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.maxConcurrent()).toBe(1);
    });

    it('re-saves rider content folded into a publish that needs retry', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      const publish = h.engine.dispatch('publish');

      await h.succeed();
      expect(h.requests[1]).toMatchObject({ command: { kind: 'publish' } });
      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'publish' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(3);
      expect(h.requests[2]).toMatchObject({
        command: { kind: 'autosave' },
        target: { status: 'draft' },
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'autosave' });
    });

    it('re-arms the autosave when the snapshot cannot be read after re-auth', async () => {
      const h = setup();
      void h.engine.dispatch('publish');
      await h.fail(sessionInvalid);

      h.throwNextSnapshot(new Error('snapshot exploded'));
      h.engine.reauthSucceeded();
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'debouncing' });

      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'autosave' } });
    });

    it('settles every waiter with the session error when re-auth is abandoned', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);
      const explicit = h.engine.dispatch('explicit');
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      h.engine.reauthAbandoned();
      await expect(field).resolves.toEqual({
        kind: 'failed',
        error: sessionInvalid,
        executedAs: 'field',
      });
      await expect(explicit).resolves.toEqual({
        kind: 'failed',
        error: sessionInvalid,
        executedAs: 'explicit',
      });
      await expect(autosave).resolves.toEqual({
        kind: 'failed',
        error: sessionInvalid,
        executedAs: 'autosave',
      });
      expect(h.engine.getState()).toEqual({
        kind: 'error',
        intent: 'field',
        error: sessionInvalid,
      });

      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('ignores reauthAbandoned when nothing is waiting on re-authentication', () => {
      const h = setup();
      h.engine.reauthAbandoned();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });
  });

  describe('coalescing and state reporting', () => {
    it('lets a later revert supersede only the pending publish and keeps its riders', async () => {
      const h = setup({ status: 'scheduled', publishedAt: FUTURE });
      void h.engine.dispatch('explicit');
      const rider = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');
      const revert = h.engine.dispatch('revert');

      await expect(publish).resolves.toEqual({ kind: 'superseded', by: 'revert' });
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'revert',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'revert', requiresRevision: true },
        target: { status: 'draft', publishedAt: null, emailOnly: false },
        saveRevision: true,
      });
      await h.succeed();
      await expect(revert).resolves.toMatchObject({ kind: 'saved', executedAs: 'revert' });
      await expect(rider).resolves.toMatchObject({ kind: 'saved', executedAs: 'revert' });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('emits each state once even when several timers arm', () => {
      const h = setup();
      void h.engine.dispatch('autosave');
      h.edit();
      void h.engine.dispatch('autosave');
      h.edit();
      void h.engine.dispatch('autosave');

      expect(h.states).toEqual([{ kind: 'debouncing' }]);
    });

    it('keeps an error state while a dropped-clean autosave passes through', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);

      const autosave = h.engine.dispatch('autosave');
      h.patch({ isDirty: false });
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error: transport });
    });

    it('surfaces a throwing snapshot port as an unknown failure', async () => {
      const h = setup();
      const cause = new Error('snapshot exploded');
      h.throwNextSnapshot(cause);

      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'snapshot exploded', cause },
        executedAs: 'explicit',
      });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toMatchObject({ kind: 'error', intent: 'explicit' });
    });

    it('resolves a background dispatch as failed when the snapshot port throws', async () => {
      const h = setup();
      const cause = new Error('snapshot exploded');
      h.throwNextSnapshot(cause);

      await expect(h.engine.dispatch('autosave')).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'snapshot exploded', cause },
        executedAs: 'autosave',
      });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('asks for confirmation when the snapshot port throws during a leave decision', async () => {
      const h = setup();
      h.throwNextSnapshot(new Error('snapshot exploded'));
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');

      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' } });
      h.throwNextSnapshot(new Error('snapshot exploded'));
      await h.succeed();
      await expect(decision).resolves.toBe('confirm');
    });

    it('lets a leave decision through once the engine is disposed mid-wait', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      h.engine.dispose();
      await expect(decision).resolves.toBe('proceed');
    });

    it('tolerates listeners that dispatch or unsubscribe during notification', () => {
      const h = setup();
      const seen: string[] = [];
      const unsubscribe = h.engine.subscribe((state) => {
        seen.push(state.kind);
        if (state.kind === 'saving') {
          unsubscribe();
          void h.engine.dispatch('field');
        }
      });
      h.engine.subscribe((state) => seen.push(`other:${state.kind}`));

      void h.engine.dispatch('explicit');

      expect(seen).toEqual(['saving', 'other:pending-coalesced']);
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'field',
      });
    });

    it('reports a throwing listener without interrupting the others', () => {
      const h = setup();
      const failure = new Error('listener exploded');
      const seen: SaveEngineState[] = [];
      h.engine.subscribe(() => {
        throw failure;
      });
      h.engine.subscribe((state) => seen.push(state));

      void h.engine.dispatch('explicit');

      expect(h.listenerErrors).toEqual([failure]);
      expect(seen).toEqual([{ kind: 'saving', intent: 'explicit' }]);
    });

    it('still saves when the onStateChange port throws, and reports it', async () => {
      const failure = new Error('state port exploded');
      const reported: unknown[] = [];
      const snapshot = { ...BASE, status: 'published', publishedAt: PAST } as SaveSnapshot;
      const engine = createSaveEngine({
        getSnapshot: () => snapshot,
        slug: idleSlug,
        prepare: (request) => Promise.resolve(request),
        execute: (prepared) =>
          Promise.resolve<SaveOutcome>({
            ok: true,
            result: { id: prepared.snapshot.id!, status: 'published', updatedAt: FUTURE },
          }),
        reconcile: () => {},
        onStateChange: () => {
          throw failure;
        },
        onListenerError: (error) => reported.push(error),
      });

      await expect(engine.dispatch('explicit')).resolves.toMatchObject({ kind: 'saved' });
      expect(engine.getState()).toEqual({ kind: 'idle' });
      expect(reported).toEqual([failure, failure]);
    });

    it('re-runs a frozen explicit after a superseded publish while the winning revert needs retry', async () => {
      const h = setup({ status: 'scheduled', publishedAt: FUTURE });
      const explicit = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');
      const revert = h.engine.dispatch('revert');
      await expect(publish).resolves.toEqual({ kind: 'superseded', by: 'revert' });

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'explicit' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(revert).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'explicit' },
        target: { status: 'scheduled', publishedAt: FUTURE },
      });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });
  });
});
