import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportsEventLog } from '@tryghost/adapter-base-cache';
import { init, getService } from '../../../../../core/server/services/post-presence';
import MemoryEventLog from '../../../../../core/server/adapters/cache/MemoryEventLog';
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');

const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../../utils/config-utils');
const post = { id: 'a'.repeat(24), type: 'post' as const };
const actor = { id: 'b'.repeat(24), name: 'Alex', profile_image: null };

afterEach(async () => {
  init({ cache: undefined, siteId: 'site' });
  await configUtils.restore();
  adapterManager.clearCache();
});

describe('presence cache selection', () => {
  it('supports the default memory setup without extending ordinary caches', async () => {
    const cache = adapterManager.getAdapter('cache:presence');
    expect(cache).toBeInstanceOf(MemoryCache);
    expect(supportsEventLog(cache)).toBe(false);
    expect(supportsEventLog(adapterManager.getAdapter('cache:settings'))).toBe(false);

    init({ cache, siteId: 'site' });
    const service = getService()!;
    await service.record(post, actor, 'opened', randomUUID());
    expect(await service.recent([post])).toHaveLength(1);
  });

  it('loads the memory event adapter through an explicit cache selection', async () => {
    configUtils.set('adapters:cache:presence', { adapter: 'MemoryEventLog' });
    const cache = adapterManager.getAdapter('cache:presence');
    expect(supportsEventLog(cache)).toBe(true);
    init({ cache, siteId: 'site' });
    const service = getService()!;
    await service.record(post, actor, 'saved', null);
    cache.reset();
    expect(await service.recent([post])).toEqual([]);
  });

  it('uses the selected event adapter without substituting memory', async () => {
    const cache = new MemoryEventLog();
    const append = vi.spyOn(cache, 'appendEvent').mockImplementation(() => {
      throw new Error('Store unavailable');
    });
    init({ cache, siteId: 'site' });
    await expect(getService()!.record(post, actor, 'opened', randomUUID())).rejects.toThrow(
      'Store unavailable',
    );
    expect(append).toHaveBeenCalledOnce();
  });
});
