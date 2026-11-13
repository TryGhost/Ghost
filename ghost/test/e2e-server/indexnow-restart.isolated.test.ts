import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import type indexNowRoot from '../../core/server/services/indexnow-ping';

const { agentProvider } = require('../utils/e2e-framework');
const events: EventEmitter = require('../../core/server/lib/common/events');
const indexnow: typeof indexNowRoot = require('../../core/server/services/indexnow-ping').default;

const EVENT_NAMES = ['post.published', 'post.published.edited'];

describe('IndexNow across boots in one process', function () {
  it('stops with the server and starts the same instance on the next boot', async function () {
    const { ghostServer } = await agentProvider.getAgentsWithFrontend();
    const service = indexnow.service;
    const subscriptions = () =>
      EVENT_NAMES.map(
        (name) => events.listeners(name).filter((listener) => listener === service.listener).length,
      );
    assert.deepEqual(subscriptions(), [1, 1]);

    await ghostServer.stop();
    assert.deepEqual(subscriptions(), [0, 0]);
    assert.equal(indexnow.service, service);

    // This boot has no server, so nothing stops IndexNow before the boot after it.
    await agentProvider.getAdminAPIAgent();
    assert.equal(indexnow.service, service);
    assert.deepEqual(subscriptions(), [1, 1]);

    await agentProvider.getAdminAPIAgent();
    assert.equal(indexnow.service, service);
    assert.deepEqual(subscriptions(), [1, 1]);
  });
});
