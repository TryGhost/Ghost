import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import type indexNowRoot from '../../core/server/services/indexnow-ping';

const { agentProvider } = require('../utils/e2e-framework');
const events: EventEmitter = require('../../core/server/lib/common/events');
const indexnow: typeof indexNowRoot = require('../../core/server/services/indexnow-ping').default;
describe('Service roots across boots in one process', function () {
  it('stops with the server and starts the same instances on the next boot', async function () {
    const { ghostServer } = await agentProvider.getAgentsWithFrontend();
    const indexnowService = indexnow.service;
    const count = (name: string, listener: unknown) =>
      events.listeners(name).filter((registered) => registered === listener).length;
    const subscriptions = () => ({
      indexnow: [
        count('post.published', indexnowService.listener),
        count('post.published.edited', indexnowService.listener),
      ],
    });
    const started = { indexnow: [1, 1] };
    assert.deepEqual(subscriptions(), started);

    await ghostServer.stop();
    assert.deepEqual(subscriptions(), { indexnow: [0, 0] });
    assert.equal(indexnow.service, indexnowService);

    // This boot has no server, so nothing stops these roots before the boot after it.
    await agentProvider.getAdminAPIAgent();
    assert.equal(indexnow.service, indexnowService);
    assert.deepEqual(subscriptions(), started);

    await agentProvider.getAdminAPIAgent();
    assert.deepEqual(subscriptions(), started);
  });

  // Slack ping is the only listener for slack.test, so its count is the application's subscription.
  it('stops the application listening with the server and starts it again on the next boot', async function () {
    const { ghostServer } = await agentProvider.getAgentsWithFrontend();
    const published = events.listenerCount('post.published');
    assert.equal(events.listenerCount('slack.test'), 1);

    await ghostServer.stop();
    assert.equal(events.listenerCount('slack.test'), 0);
    // IndexNow and Slack ping each stop listening for published posts.
    assert.equal(events.listenerCount('post.published'), published - 2);

    // This boot has no server, so nothing stops the listeners before the boot after it.
    await agentProvider.getAdminAPIAgent();
    assert.equal(events.listenerCount('slack.test'), 1);

    await agentProvider.getAdminAPIAgent();
    assert.equal(events.listenerCount('slack.test'), 1);
  });
});
