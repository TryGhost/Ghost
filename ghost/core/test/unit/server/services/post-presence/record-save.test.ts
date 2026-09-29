import { afterEach, describe, expect, it } from 'vitest';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { recordSave } from '../../../../../core/server/services/post-presence/record-save';
import { init, getService } from '../../../../../core/server/services/post-presence';
// @ts-expect-error Legacy module.
import labs from '../../../../../core/shared/labs';
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');

const actor = { id: 'a'.repeat(24), name: 'Alex', profile_image: null };
const resource = { id: 'b'.repeat(24), type: 'post' as const };
const frame = {
  options: { context: { user: actor.id, api_key: null } },
  user: { toJSON: () => actor },
};

afterEach(() => sinon.restore());
describe('save presence side effect', () => {
  it('does no cache work while disabled or for API automation', async () => {
    const cache = { appendEvent: sinon.stub().resolves(1), readEvents: sinon.stub().resolves([]) };
    init({ cache, siteId: 'site' });
    const flag = sinon.stub(labs, 'isSet').returns(false);
    await recordSave(frame, resource);
    flag.returns(true);
    await recordSave(
      { ...frame, options: { context: { user: actor.id, api_key: { id: 'token' } } } },
      resource,
    );
    expect(cache.appendEvent.called).toBe(false);
  });
  it('does not fail saving when Redis is unavailable and never falls back to local state', async () => {
    sinon.stub(labs, 'isSet').returns(true);
    sinon.stub(logging, 'warn');
    const appendEvent = sinon.stub().rejects(new Error('Redis unavailable'));
    init({ cache: { appendEvent, readEvents: async () => [] }, siteId: 'site' });
    await expect(recordSave(frame, resource)).resolves.toBeUndefined();
    expect(appendEvent.calledOnce).toBe(true);
    expect(await getService()?.recent([resource])).toEqual([]);
  });
  it('records a timestamped save without an active editor session', async () => {
    sinon.stub(labs, 'isSet').returns(true);
    init({ cache: new MemoryCache(), siteId: 'site' });
    await recordSave(frame, resource);
    expect(await getService()?.recent([resource])).toEqual([
      expect.objectContaining({ userId: actor.id, action: 'saved', sessionId: null }),
    ]);
  });
});
