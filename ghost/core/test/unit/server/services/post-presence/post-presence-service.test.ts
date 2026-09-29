import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PostPresenceService,
  MAX_EVENTS,
} from '../../../../../core/server/services/post-presence/post-presence-service';
import { init, getService } from '../../../../../core/server/services/post-presence';
import MemoryEventLog from '../../../../../core/server/adapters/cache/MemoryEventLog';

const post = { id: 'a'.repeat(24), type: 'post' as const };
const actor = { id: 'b'.repeat(24), name: 'Alex Smith', profile_image: null };

afterEach(() => vi.useRealTimers());

describe('PostPresenceService', () => {
  it('shares concurrent events across instances and isolates tenants', async () => {
    const cache = new MemoryEventLog();
    const first = new PostPresenceService(cache, 'site-a');
    const second = new PostPresenceService(cache, 'site-a');
    const other = new PostPresenceService(cache, 'site-b');
    await Promise.all([
      first.record(post, actor, 'opened', randomUUID()),
      second.record(post, { ...actor, id: 'c'.repeat(24) }, 'editing', randomUUID()),
    ]);
    expect(await second.recent([post])).toHaveLength(2);
    expect(await other.recent([post])).toEqual([]);
    expect(await first.recent([{ ...post, type: 'page' }])).toEqual([]);
  });

  it('keeps separate tabs and expires a vanished tab while another remains active', async () => {
    vi.useFakeTimers();
    const cache = new MemoryEventLog();
    const service = new PostPresenceService(cache, 'site');
    const tab = randomUUID();
    await service.record(post, actor, 'opened', tab);
    await service.record(post, actor, 'opened', randomUUID());
    expect(await service.recent([post])).toHaveLength(2);
    vi.advanceTimersByTime(31000);
    await service.record(post, actor, 'editing', tab);
    expect(await service.recent([post])).toHaveLength(1);
    vi.advanceTimersByTime(3600001);
    expect(await service.recent([post], 0)).toEqual([]);
  });

  it('bounds retained history and rejects malformed cached events', async () => {
    const cache = new MemoryEventLog();
    const service = new PostPresenceService(cache, 'site');
    const key = `presence:v1:site:post:${post.id}`;
    for (let i = 0; i < MAX_EVENTS + 5; i++) {
      await service.record(post, actor, 'editing', randomUUID());
    }
    expect(cache.readEvents(key, 0)).toHaveLength(MAX_EVENTS);
    cache.appendEvent(key, '{broken', Date.now(), 3600, MAX_EVENTS);
    expect((await service.recent([post])).length).toBeLessThan(MAX_EVENTS);
  });

  it('shares a bounded rate limit across instances and lets it expire', async () => {
    vi.useFakeTimers();
    const cache = new MemoryEventLog();
    const first = new PostPresenceService(cache, 'site');
    const second = new PostPresenceService(cache, 'site');
    for (let i = 0; i < 30; i++) {
      expect(await first.allowPoll(actor.id)).toBe(true);
    }
    expect(await second.allowPoll(actor.id)).toBe(false);
    vi.advanceTimersByTime(10001);
    expect(await second.allowPoll(actor.id)).toBe(true);
  });

  it('propagates cache failures without retaining local presence', async () => {
    const cache = {
      appendEvent: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
      readEvents: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    };
    const service = new PostPresenceService(cache, 'site');
    await expect(service.record(post, actor, 'opened', randomUUID())).rejects.toThrow(
      'Redis unavailable',
    );
    await expect(service.recent([post])).rejects.toThrow('Redis unavailable');
    init({ cache: { get: () => null, set: () => {} }, siteId: 'site' });
    expect(getService()).toBeUndefined();
  });
});
