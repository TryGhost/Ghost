import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import type indexNowRoot from '../../core/server/services/indexnow-ping';
import type slackPingRoot from '../../core/server/services/slack-ping';

const { agentProvider } = require('../utils/e2e-framework');
const events: EventEmitter = require('../../core/server/lib/common/events');
const indexnow: typeof indexNowRoot = require('../../core/server/services/indexnow-ping').default;
const slack: typeof slackPingRoot = require('../../core/server/services/slack-ping').default;

describe('Service roots across boots in one process', function () {
  it('stops with the server and starts the same instances on the next boot', async function () {
    const { ghostServer } = await agentProvider.getAgentsWithFrontend();
    const indexnowService = indexnow.service;
    const slackService = slack.service;
    const count = (name: string, listener: unknown) =>
      events.listeners(name).filter((registered) => registered === listener).length;
    const subscriptions = () => ({
      indexnow: [
        count('post.published', indexnowService.listener),
        count('post.published.edited', indexnowService.listener),
      ],
      slack: [
        count('post.published', slackService.postListener),
        count('slack.test', slackService.testListener),
      ],
    });
    const started = { indexnow: [1, 1], slack: [1, 1] };
    assert.deepEqual(subscriptions(), started);

    await ghostServer.stop();
    assert.deepEqual(subscriptions(), { indexnow: [0, 0], slack: [0, 0] });
    assert.equal(indexnow.service, indexnowService);
    assert.equal(slack.service, slackService);

    // This boot has no server, so nothing stops these roots before the boot after it.
    await agentProvider.getAdminAPIAgent();
    assert.equal(indexnow.service, indexnowService);
    assert.equal(slack.service, slackService);
    assert.deepEqual(subscriptions(), started);

    await agentProvider.getAdminAPIAgent();
    assert.deepEqual(subscriptions(), started);
  });
});
