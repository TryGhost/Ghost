import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deriveTarget,
  resolveTarget,
  TIMED_SAVE_INTERVAL_MS,
  zeroMilliseconds,
  type DispatchIntent,
  type PostStatus,
  type SaveCommand,
  type SaveTarget,
} from './save-engine';
import {
  dispatchAny,
  flush,
  FUTURE,
  PAST,
  setup,
  transport,
} from './__test-utils__/engine-harness';

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
  describe('only explicit and leave saves set save_revision', () => {
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

  describe('scheduled saves zero milliseconds and preserve the publish time', () => {
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
});
