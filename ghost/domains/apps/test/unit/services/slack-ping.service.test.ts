import assert from 'node:assert/strict';
import nock from 'nock';
import sinon from 'sinon';
import { SlackPing } from '../../../services/slack-ping.service';

const testUtils = require('../../../../../test/utils');
const { createLoggingFake } = require('../../../../../test/utils/logging-utils');
const request = require('@tryghost/request');

// Test data
const slackURL = 'https://hooks.slack.com/services/a-b-c-d';
const slackURLPath = '/services/a-b-c-d';
const testMessage = {
  message: 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function waitFor(assertion: () => boolean, timeout = 1000) {
  const deadline = Date.now() + timeout;

  while (!assertion() && Date.now() < deadline) {
    await wait(50);
  }
}

// Build a SlackPing with fully injected fakes. The real @tryghost/request
// is injected so nock intercepts at the HTTP layer - only the stateful/config
// singletons become injected fakes.
function createService() {
  const settingsCache = { get: sinon.stub() };

  const urlService = {
    getUrlForResource: sinon.stub(),
  };

  const urlUtils = { urlFor: sinon.stub().returns(null) };

  const blogIcon = { getIconUrl: sinon.stub().returns('http://myblog.com/favicon.ico') };

  const logging = createLoggingFake();

  const deps = { blogIcon, logging, request, settingsCache, urlService, urlUtils };
  const service = new SlackPing(deps);

  return { service, deps };
}

type SlackRequest = Record<string, any>;

function mockSlackWebhook() {
  const requests: SlackRequest[] = [];
  const scope = nock('https://hooks.slack.com')
    .post(slackURLPath, (body) => {
      requests.push(typeof body === 'string' ? JSON.parse(body) : body);
      return true;
    })
    .reply(200);

  return {
    requests,
    scope,
  };
}

describe('Slack ping service', function () {
  afterEach(function () {
    sinon.restore();
    nock.cleanAll();
  });

  describe('ping()', function () {
    it('makes a request for a post if url is provided', async function () {
      const post = testUtils.DataGenerator.forKnex.createPost({
        slug: 'webhook-test',
        html: `<p>Hello World!</p><p>This is a test post.</p><!--members-only--><p>This is members only content.</p>`,
      });
      const clock = sinon.useFakeTimers({ now: 1700000000000, toFake: ['Date'] });
      const { service, deps } = createService();
      const { requests, scope } = mockSlackWebhook();

      deps.settingsCache.get.withArgs('slack_url').returns(slackURL);
      deps.urlService.getUrlForResource
        .withArgs(sinon.match({ id: post.id, type: 'posts' }), { absolute: true })
        .returns('http://myblog.com/' + post.slug + '/');

      clock.setSystemTime(1700000300999);
      try {
        service.ping(post);
      } finally {
        // Restore Date before waitFor uses it to enforce its timeout.
        clock.restore();
      }

      await waitFor(() => scope.isDone());

      assert.equal(scope.isDone(), true);
      sinon.assert.calledOnce(deps.urlService.getUrlForResource);
      sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');

      const requestData = requests[0]!;

      assert.equal(requestData.attachments[0].title, post.title);
      assert.equal(requestData.attachments[0].title_link, 'http://myblog.com/webhook-test/');
      assert.equal(requestData.attachments[0].fields[0].value, 'Hello World!This is a test post.');
      assert.equal(requestData.attachments[1].ts, 1700000300);
      assert(!('author_name' in requestData.attachments[0]));
      assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');

      assert.equal(requestData.username, 'Ghost');
      assert.equal(requestData.unfurl_links, true);
    });

    it('makes a request for a test message if url is provided', async function () {
      const { service, deps } = createService();
      const { requests, scope } = mockSlackWebhook();

      deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

      service.ping(testMessage);

      await waitFor(() => scope.isDone());

      assert.equal(scope.isDone(), true);
      sinon.assert.notCalled(deps.urlService.getUrlForResource);
      sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');

      const requestData = requests[0];

      assert.equal(
        requestData.text,
        'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
      );
      assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');
      assert.equal(requestData.username, 'Ghost');
      assert.equal(requestData.unfurl_links, true);
    });

    it('makes a request and errors', async function () {
      const { service, deps } = createService();
      const requestScope = nock('https://hooks.slack.com')
        .post(slackURLPath)
        .replyWithError('Slack unavailable');

      deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

      service.ping(testMessage);

      // Bound the poll so a regression fails with a clear assertion
      // below rather than stalling until the suite-wide test timeout.
      await waitFor(() => deps.logging.error.calledOnce);
      assert.equal(requestScope.isDone(), true);
      sinon.assert.calledOnce(deps.logging.error);
    });

    it('does not make a request if post is a page', function () {
      const post = testUtils.DataGenerator.forKnex.createPost({ type: 'page' });
      const { service, deps } = createService();
      const { scope } = mockSlackWebhook();

      deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

      service.ping(post);

      assert.equal(scope.isDone(), false);
      sinon.assert.calledOnce(deps.urlService.getUrlForResource);
      sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');
    });

    it("does not send webhook for 'welcome' post", function () {
      const post = testUtils.DataGenerator.forKnex.createPost({ slug: 'welcome' });
      const { service, deps } = createService();
      const { scope } = mockSlackWebhook();

      deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

      service.ping(post);

      assert.equal(scope.isDone(), false);
      sinon.assert.calledOnce(deps.urlService.getUrlForResource);
      sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');
    });

    it('handles broken slack settings', function () {
      const post = testUtils.DataGenerator.forKnex.createPost({ slug: 'any' });
      const { service, deps } = createService();

      deps.settingsCache.get.withArgs('slack_url').returns(undefined);

      service.ping(post);

      sinon.assert.called(deps.urlService.getUrlForResource);
      sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');
    });
  });
});
