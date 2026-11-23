import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import type indexNowRoot from '../../core/server/services/indexnow-ping';
import type slackPingRoot from '../../core/server/services/slack-ping';

const { IncorrectUsageError } = require('@tryghost/errors');
const { agentProvider } = require('../utils/e2e-framework');
const events: EventEmitter = require('../../core/server/lib/common/events');
const indexnow: typeof indexNowRoot = require('../../core/server/services/indexnow-ping').default;
const slack: typeof slackPingRoot = require('../../core/server/services/slack-ping').default;

// The events these two roots declare listeners for.
const DECLARED = ['post.published', 'post.published.edited', 'slack.test'];

describe('Service roots across boots in one process', function () {
  it('stops listening and forgets its services with the server, and builds new ones on the next boot', async function () {
    const before = Object.fromEntries(DECLARED.map((name) => [name, events.listenerCount(name)]));
    const { ghostServer } = await agentProvider.getAgentsWithFrontend();
    const listening = () =>
      Object.fromEntries(DECLARED.map((name) => [name, events.listenerCount(name)]));
    const whileBooted = listening();
    // IndexNow and Slack ping both listen for a published post.
    assert.ok(whileBooted['post.published']! >= before['post.published']! + 2);
    assert.ok(whileBooted['slack.test']! >= before['slack.test']! + 1);
    const indexnowService = indexnow.service;
    const slackService = slack.service;

    await ghostServer.stop();

    // The application stopped listening and holds no instance to read.
    assert.ok(listening()['post.published']! <= whileBooted['post.published']! - 2);
    assert.ok(listening()['slack.test']! <= whileBooted['slack.test']! - 1);
    assert.throws(() => indexnow.service, IncorrectUsageError);
    assert.throws(() => slack.service, IncorrectUsageError);

    await agentProvider.getAdminAPIAgent();

    // The next boot listens once more, not twice, and builds its own instances.
    assert.deepEqual(listening(), whileBooted);
    assert.notEqual(indexnow.service, indexnowService);
    assert.notEqual(slack.service, slackService);

    // A boot with no server has nothing that stops its services, so the test helper closes them
    // before the next boot, which then builds its own and listens once.
    const earlier = indexnow.service;
    await agentProvider.getAdminAPIAgent();
    assert.notEqual(indexnow.service, earlier);
    assert.deepEqual(listening(), whileBooted);
  });
});
