import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { init, getService } from '../../../../../core/server/services/post-presence';
import MemoryEventLog from '../../../../../core/server/adapters/cache/MemoryEventLog';

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
  it('records and reads presence with the default cache configuration', async () => {
    const cache = adapterManager.getAdapter('cache:presence');

    init({ cache, siteId: 'site' });
    const service = getService()!;
    await service.record(post, actor, 'opened', randomUUID());
    expect(await service.recent([post])).toHaveLength(1);
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
