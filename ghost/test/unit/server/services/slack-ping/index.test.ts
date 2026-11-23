import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import sinon from 'sinon';
import type { SlackPingService as SlackPingServiceType } from '../../../../../core/server/services/slack-ping/slack-ping-service';

const root: typeof import('../../../../../core/server/services/slack-ping').default =
  require('../../../../../core/server/services/slack-ping').default;
const {
  openServices,
  services,
}: typeof import('../../../../utils/services') = require('../../../../utils/services');
const {
  SlackPingService,
}: typeof import('../../../../../core/server/services/slack-ping/slack-ping-service') = require('../../../../../core/server/services/slack-ping/slack-ping-service');
const events: EventEmitter = require('../../../../../core/server/lib/common/events');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const { blogIcon } = require('../../../../../core/server/lib/image');
const urlService = require('../../../../../core/server/services/url');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const requestExternal = require('../../../../../core/server/lib/request-external');
const { InternalServerError } = require('@tryghost/errors');
const {
  listening,
}: typeof import('../../../../../bootstrap/services') = require('../../../../../bootstrap/services');

// Opening the services registers every root that declares listeners, and other roots listen for
// post.published too. They are made inert, so that only this root reacts to an event.
function silenceOtherRoots(sandbox: sinon.SinonSandbox) {
  for (const named of listening) {
    const other = named();
    if (other !== root) {
      sandbox.stub(other, 'create').returns({});
      for (const listener of other.listeners) {
        sandbox.stub(listener, 'handle');
      }
    }
  }
}

const postModel = {
  toJSON: () => ({ id: 'post-id', slug: 'a-post', title: 'A post', html: '<p>Hello.</p>' }),
  related: () => ({ toJSON: () => [] }),
};

describe('Slack ping root', function () {
  let originalListeners: Map<string, ReturnType<EventEmitter['rawListeners']>>;
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    originalListeners = new Map(
      ['post.published', 'slack.test'].map((name) => [name, events.rawListeners(name)]),
    );
    for (const name of originalListeners.keys()) {
      events.removeAllListeners(name);
    }
    silenceOtherRoots(sandbox);
    openServices();
  });

  afterEach(function () {
    sandbox.restore();
    for (const [name, listeners] of originalListeners) {
      events.removeAllListeners(name);
      for (const listener of listeners) {
        events.on(name, listener as (...args: unknown[]) => void);
      }
    }
  });

  it('builds the service with the shared dependencies on first use and keeps it', function () {
    const service = root.service;

    assert.ok(service instanceof SlackPingService);
    for (const [name, dependency] of Object.entries({
      blogIcon,
      logging,
      request: requestExternal,
      settingsCache,
      urlService,
      urlUtils,
    })) {
      assert.equal(service[name as keyof SlackPingServiceType], dependency, name);
    }
    assert.equal(root.service, service);
  });

  it('dispatches each real event once without waiting for transport and reads changed settings on the retained instance', async function () {
    const service = root.service;
    const settings: Record<string, string> = {
      slack_url: 'https://hooks.slack.com/services/first',
      slack_username: 'First sender',
      title: 'First title',
    };
    sandbox.stub(settingsCache, 'get').callsFake((key: unknown) => settings[key as string]);
    sandbox.stub(blogIcon, 'getIconUrl').returns('https://example.com/icon.png');
    sandbox.stub(urlService, 'getUrlForResource').returns('https://example.com/a-post/');
    sandbox.stub(urlUtils, 'urlFor').returns(null);
    let release!: (value: unknown) => void;
    const response = new Promise((resolve) => {
      release = resolve;
    });
    const request = sandbox.stub(service, 'request').returns(response);
    const ping = sandbox.spy(service, 'ping');
    let settled = false;

    try {
      assert.equal(events.emit('post.published', postModel), true);
      sinon.assert.calledOnce(request);
      void ping.firstCall.returnValue!.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );
      assert.equal(request.firstCall.args[0], settings.slack_url);
      const firstBody = JSON.parse(request.firstCall.args[1].body as string);
      assert.equal(firstBody.username, 'First sender');
      assert.equal(firstBody.text, 'Notification from *First title* :ghost:');

      settings.slack_url = 'https://hooks.slack.com/services/second';
      settings.slack_username = 'Second sender';
      assert.equal(root.service, service);
      assert.equal(events.emit('slack.test'), true);
      sinon.assert.calledTwice(request);
      sinon.assert.calledTwice(ping);
      assert.equal(request.secondCall.args[0], settings.slack_url);
      const secondBody = JSON.parse(request.secondCall.args[1].body as string);
      assert.equal(secondBody.username, 'Second sender');
      assert.equal(
        secondBody.text,
        'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
      );
      await Promise.resolve();
      assert.equal(settled, false);

      events.emit('post.published', postModel, { importing: true });
      sinon.assert.calledTwice(ping);
      settings.slack_url = '';
      events.emit('slack.test');
      sinon.assert.calledThrice(ping);
      assert.equal(ping.thirdCall.returnValue, undefined);
      sinon.assert.calledTwice(request);
    } finally {
      release({ statusCode: 200 });
      await Promise.allSettled(ping.returnValues);
    }
    assert.equal(settled, true);
  });

  for (const eventName of ['post.published', 'slack.test']) {
    it(`propagates a synchronous transport throw through ${eventName} dispatch`, async function () {
      const service = root.service;
      sandbox
        .stub(settingsCache, 'get')
        .withArgs('slack_url')
        .returns('https://hooks.slack.com/services/failure');
      sandbox.stub(blogIcon, 'getIconUrl').returns('https://example.com/icon.png');
      sandbox.stub(urlService, 'getUrlForResource').returns('https://example.com/a-post/');
      sandbox.stub(urlUtils, 'urlFor').returns(null);
      const failure = new Error('Transport threw synchronously');
      const request = sandbox.stub(service, 'request').throws(failure);
      const log = sandbox.stub(logging, 'error');
      const ping = sandbox.spy(service, 'ping');

      try {
        assert.throws(
          () => events.emit(eventName, postModel),
          (error) => error === failure,
        );
        sinon.assert.calledOnce(request);
        sinon.assert.notCalled(log);
      } finally {
        await Promise.allSettled(ping.returnValues);
      }
    });
  }

  it('logs a wrapped asynchronous request failure and fulfills both event pings', async function () {
    const service = root.service;
    sandbox
      .stub(settingsCache, 'get')
      .withArgs('slack_url')
      .returns('https://hooks.slack.com/services/failure');
    sandbox.stub(blogIcon, 'getIconUrl').returns('https://example.com/icon.png');
    sandbox.stub(urlService, 'getUrlForResource').returns('https://example.com/a-post/');
    sandbox.stub(urlUtils, 'urlFor').returns(null);
    const failure = Object.assign(new Error('Slack unavailable'), { code: 'ECONNRESET' });
    const request = sandbox.stub(service, 'request').rejects(failure);
    const log = sandbox.stub(logging, 'error');
    const ping = sandbox.spy(service, 'ping');

    try {
      assert.equal(events.emit('post.published', postModel), true);
      assert.equal(events.emit('slack.test'), true);
      assert.deepEqual(await Promise.all(ping.returnValues), [undefined, undefined]);
      sinon.assert.calledTwice(request);
      sinon.assert.calledTwice(log);
      for (const call of log.getCalls()) {
        const [error] = call.args;
        assert.ok(error instanceof InternalServerError);
        assert.equal(
          error.context,
          'The slack service was unable to send a ping request, your site will continue to function.',
        );
        assert.equal(
          error.help,
          'If you get this error repeatedly, please seek help on https://docs.ghost.org/.',
        );
        assert.equal(error.code, 'ECONNRESET');
        assert.match(error.stack, /Slack unavailable/);
      }
    } finally {
      await Promise.allSettled(ping.returnValues);
    }
  });

  it('stops handling events when services close, and an event after they reopen builds a new instance', async function () {
    const unrelated = () => {};
    for (const name of ['post.published', 'slack.test']) {
      events.on(name, unrelated);
    }
    const service = root.service;
    const ping = sandbox.stub(SlackPingService.prototype, 'ping');

    await services.close();
    assert.deepEqual(events.listeners('post.published'), [unrelated]);
    assert.deepEqual(events.listeners('slack.test'), [unrelated]);
    events.emit('post.published', postModel);
    events.emit('slack.test');
    sinon.assert.notCalled(ping);

    // Nothing reads the service before the events arrive: the first one builds it.
    openServices();
    events.emit('post.published', postModel);
    events.emit('slack.test');
    sinon.assert.calledTwice(ping);
    const rebuilt = root.service;
    assert.ok(rebuilt instanceof SlackPingService);
    assert.notEqual(rebuilt, service);
    sinon.assert.alwaysCalledOn(ping, rebuilt);
  });
});
