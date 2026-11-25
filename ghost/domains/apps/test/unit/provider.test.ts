import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import sinon from 'sinon';
import { createApplication, instance } from '#foundation/application';
import type { Scope } from '#foundation/application';
import { defineProvider } from '#support/define-provider';
import { defineService } from '#support/define-service';
import appsProvider from '../../provider';
import { EditIntegration } from '../../actions/edit-integration.action';
import { SlackPing, SlackPingService } from '../../services/slack-ping.service';
import {
  BlogIcon,
  ExternalRequest,
  LegacyEvents,
  Logging,
  Models,
  SettingsCache,
  UrlService,
  UrlUtils,
} from '../../../../shared/transition/legacy';

const events: EventEmitter = require('../../../../core/server/lib/common/events');
const settingsCache = require('../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const { blogIcon } = require('../../../../core/server/lib/image');
const urlService = require('../../../../core/server/services/url');
const urlUtils = require('../../../../core/shared/url-utils').default;
const requestExternal = require('../../../../core/server/lib/request-external');

const EVENTS = ['post.published', 'slack.test'];
const postModel = {
  toJSON: () => ({ id: 'post-id', slug: 'a-post', title: 'A post', html: '<p>Hello.</p>' }),
  related: () => ({ toJSON: () => [] }),
};
const listenerCounts = (bus: EventEmitter) => EVENTS.map((name) => bus.listenerCount(name));

describe('Apps provider', function () {
  describe('with the legacy modules, as Ghost boots it', function () {
    let originalListeners: Map<string, ReturnType<EventEmitter['rawListeners']>>;
    let sandbox: sinon.SinonSandbox;
    let site: Scope;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      originalListeners = new Map(EVENTS.map((name) => [name, events.rawListeners(name)]));
      for (const name of EVENTS) {
        events.removeAllListeners(name);
      }
      const application = createApplication({ providers: [appsProvider] });
      application.boot();
      site = application.createSiteScope();
    });

    afterEach(function () {
      site.dispose();
      sandbox.restore();
      for (const [name, listeners] of originalListeners) {
        events.removeAllListeners(name);
        for (const listener of listeners) {
          events.on(name, listener as (...args: unknown[]) => void);
        }
      }
    });

    // That nothing is built before the first event is covered by the foundation's own tests.
    it('listens from the moment the site scope opens, and one instance handles every event', function () {
      assert.deepEqual(listenerCounts(events), [1, 1]);
      const ping = sandbox.stub(SlackPingService.prototype, 'ping');

      events.emit('slack.test');
      events.emit('slack.test');

      sinon.assert.calledTwice(ping);
      sinon.assert.alwaysCalledOn(ping, site.get(SlackPing));
    });

    it('builds one instance per scope from the shared legacy modules', function () {
      const service = site.get(SlackPing);

      assert.ok(service instanceof SlackPingService);
      assert.equal(site.get(SlackPing), service);
      for (const [name, dependency] of Object.entries({
        blogIcon,
        logging,
        request: requestExternal,
        settingsCache,
        urlService,
        urlUtils,
      })) {
        assert.equal(service[name as keyof typeof service], dependency, name);
      }
    });

    it('dispatches each real event once and reads changed settings on the retained instance', async function () {
      const service = site.get(SlackPing);
      const settings: Record<string, string> = {
        slack_url: 'https://hooks.slack.com/services/first',
        slack_username: 'First sender',
        title: 'First title',
      };
      sandbox.stub(settingsCache, 'get').callsFake((key: unknown) => settings[key as string]);
      sandbox.stub(blogIcon, 'getIconUrl').returns('https://example.com/icon.png');
      sandbox.stub(urlService, 'getUrlForResource').returns('https://example.com/a-post/');
      sandbox.stub(urlUtils, 'urlFor').returns(null);
      const request = sandbox.stub(service, 'request').resolves({ statusCode: 200 });
      const ping = sandbox.spy(service, 'ping');

      assert.equal(events.emit('post.published', postModel), true);
      sinon.assert.calledOnce(request);
      assert.equal(request.firstCall.args[0], settings.slack_url);
      assert.equal(
        JSON.parse(request.firstCall.args[1].body as string).text,
        'Notification from *First title* :ghost:',
      );

      settings.slack_url = 'https://hooks.slack.com/services/second';
      assert.equal(events.emit('slack.test'), true);
      sinon.assert.calledTwice(request);
      assert.equal(request.secondCall.args[0], settings.slack_url);

      events.emit('post.published', postModel, { importing: true });
      sinon.assert.calledTwice(ping);
      await Promise.allSettled(ping.returnValues);
    });

    for (const eventName of EVENTS) {
      it(`propagates a synchronous transport throw through ${eventName} dispatch`, function () {
        const service = site.get(SlackPing);
        sandbox
          .stub(settingsCache, 'get')
          .withArgs('slack_url')
          .returns('https://hooks.slack.com/x');
        sandbox.stub(blogIcon, 'getIconUrl').returns('https://example.com/icon.png');
        sandbox.stub(urlService, 'getUrlForResource').returns('https://example.com/a-post/');
        sandbox.stub(urlUtils, 'urlFor').returns(null);
        const failure = new Error('Transport threw synchronously');
        sandbox.stub(service, 'request').throws(failure);

        assert.throws(
          () => events.emit(eventName, postModel),
          (error) => error === failure,
        );
      });
    }

    it('stops listening when the scope ends, leaving other listeners alone', function () {
      const unrelated = () => {};
      for (const name of EVENTS) {
        events.on(name, unrelated);
      }
      const service = site.get(SlackPing);
      const ping = sandbox.stub(service, 'ping');

      site.dispose();
      for (const name of EVENTS) {
        assert.deepEqual(events.listeners(name), [unrelated]);
      }
      events.emit('post.published', postModel);
      events.emit('slack.test');
      sinon.assert.notCalled(ping);
    });

    for (const eventName of EVENTS) {
      it(`removes its subscriptions when ${eventName} registration fails, and the next scope listens`, function () {
        site.dispose();
        const unrelated = () => {};
        for (const name of EVENTS) {
          events.on(name, unrelated);
        }
        const failure = new Error(`Cannot subscribe ${eventName}`);
        const originalOn = events.on.bind(events);
        const on = sandbox.stub(events, 'on').callsFake((name, listener) => {
          originalOn(name, listener);
          if (name === eventName) {
            throw failure;
          }
          return events;
        });
        const application = createApplication({ providers: [appsProvider] });
        application.boot();

        assert.throws(
          () => application.createSiteScope(),
          (error) => error === failure,
        );
        for (const name of EVENTS) {
          assert.deepEqual(events.listeners(name), [unrelated]);
        }

        on.restore();
        site = application.createSiteScope();
        assert.deepEqual(listenerCounts(events), [2, 2]);
      });
    }
  });

  describe('with two sites in one process', function () {
    function siteInstances(name: string) {
      const bus = new EventEmitter();
      const request = sinon.stub().resolves({ statusCode: 200 });
      const settings: Record<string, string> = {
        slack_url: `https://hooks.slack.com/services/${name}`,
        title: `${name} title`,
      };
      return {
        bus,
        request,
        instances: [
          instance(LegacyEvents, bus),
          instance(SettingsCache, { get: (key: string) => settings[key] } as typeof settingsCache),
          instance(UrlUtils, {
            urlFor: () => `https://${name}.example/`,
          } as unknown as typeof urlUtils),
          instance(UrlService, { getUrlForResource: () => `https://${name}.example/a-post/` }),
          instance(BlogIcon, { getIconUrl: () => `https://${name}.example/icon.png` }),
          instance(ExternalRequest, request),
        ],
      };
    }

    it('gives each site its own Slack ping, and an event reaches only its own site', async function () {
      const logger = { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
      const application = createApplication({
        providers: [appsProvider],
        instances: [instance(Logging, logger as unknown as typeof logging)],
      });
      application.boot();
      const first = siteInstances('first');
      const second = siteInstances('second');
      const firstSite = application.createSiteScope({ instances: first.instances });
      const secondSite = application.createSiteScope({ instances: second.instances });

      first.bus.emit('post.published', postModel);
      sinon.assert.calledOnce(first.request);
      sinon.assert.notCalled(second.request);
      assert.equal(first.request.firstCall.args[0], 'https://hooks.slack.com/services/first');
      assert.equal(
        JSON.parse(first.request.firstCall.args[1].body).text,
        'Notification from *first title* :ghost:',
      );

      second.bus.emit('slack.test');
      sinon.assert.calledOnce(first.request);
      sinon.assert.calledOnce(second.request);
      assert.equal(second.request.firstCall.args[0], 'https://hooks.slack.com/services/second');

      assert.notEqual(firstSite.get(SlackPing), secondSite.get(SlackPing));
      assert.equal(firstSite.get(SlackPing).logging, secondSite.get(SlackPing).logging);
      assert.equal(firstSite.get(Logging), application.get(Logging));

      firstSite.dispose();
      first.bus.emit('slack.test');
      second.bus.emit('slack.test');
      sinon.assert.calledOnce(first.request);
      sinon.assert.calledTwice(second.request);
      secondSite.dispose();
    });
  });

  describe('what other code may ask the domain to do', function () {
    it("edits an integration through the action, with the site scope's models", async function () {
      const edited = { toJSON: () => ({ id: 'integration-id' }) };
      const models = {
        Integration: { edit: sinon.stub().resolves(edited), findOne: sinon.stub() },
        ApiKey: { findOne: sinon.stub(), refreshSecret: sinon.stub() },
      };
      const application = createApplication({ providers: [appsProvider] });
      application.boot();
      const site = application.createSiteScope({ instances: [instance(Models, models)] });

      const editIntegration = site.get(EditIntegration);
      assert.equal(await editIntegration({ name: 'Zapier' }, { id: 'integration-id' }), edited);
      sinon.assert.calledOnceWithExactly(
        models.Integration.edit,
        { name: 'Zapier' },
        { id: 'integration-id', require: true },
      );
      site.dispose();
    });
  });

  describe('lifetime mistakes are rejected at boot', function () {
    it('rejects Slack ping declared for the whole process, because it needs per-site services', function () {
      const ProcessWideSlackPing = defineService({ ...SlackPing, lifetime: 'process' });
      const application = createApplication({
        providers: [defineProvider({ name: 'apps', services: [ProcessWideSlackPing] })],
      });

      assert.throws(
        () => application.boot(),
        /"apps\/slack-ping" lives for the process but needs "blog-icon" \(as blogIcon\), which lives only for one site\./,
      );
    });
  });
});
