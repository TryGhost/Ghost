const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setImmediate } = require('node:timers/promises');
const sinon = require('sinon');
const ghostVersion = require('@tryghost/version');
const logging = require('@tryghost/logging');
const { LimitService } = require('@tryghost/limit-service');

const WebhookTrigger = require('../../../../../core/server/services/webhooks/webhook-trigger');
const configUtils = require('../../../../utils/config-utils');

const SIGNATURE_HEADER = 'X-Ghost-Signature';
const SIGNATURE_REGEX = /^sha256=[a-z0-9]+, t=\d+$/;

describe('Webhook Service', function () {
  const WEBHOOK_EVENT = 'post.added';
  const WEBHOOK_TARGET_URL = 'http://example.com';
  const WEBHOOK_SECRET = 'abc123dontstealme';

  let models, payload, request, webhookTrigger, limitService;

  beforeEach(function () {
    models = {
      Webhook: {
        edit: sinon.stub(),
        destroy: sinon.stub(),
        findAllByEvent: sinon.stub(),
        getByEventAndTarget: sinon.stub(),
        add: sinon.stub(),
      },
    };

    models.Webhook.edit.resolves(null);
    models.Webhook.destroy.resolves(null);
    models.Webhook.findAllByEvent.resolves(null);
    models.Webhook.getByEventAndTarget.resolves(null);
    models.Webhook.add.resolves(null);

    payload = sinon.stub();
    request = sinon.stub().resolves({});

    const realLimitService = new LimitService();
    limitService = sinon.stub(realLimitService);
    limitService.isLimited.withArgs('customIntegrations').returns(false);
    limitService.checkWouldGoOverLimit.withArgs('customIntegrations').resolves(false);

    webhookTrigger = new WebhookTrigger({ models, payload, request, limitService });

    sinon.stub(webhookTrigger, 'onSuccess').callsFake(() => Promise.resolve());
    sinon.stub(webhookTrigger, 'onError').callsFake(() => Promise.resolve());
  });

  afterEach(async function () {
    await configUtils.restore();
  });

  describe('constructor', function () {
    it('uses the external request library when internal IPs disabled in config', function () {
      configUtils.set('security:allowWebhookInternalIPs', false);

      const constructedWebhookTrigger = new WebhookTrigger({ models, payload, limitService });

      assert.equal(
        constructedWebhookTrigger.request,
        require('../../../../../core/server/lib/request-external'),
      );
    });

    it('uses base request library when internal IPs enabled in config', function () {
      configUtils.set('security:allowWebhookInternalIPs', true);

      const constructedWebhookTrigger = new WebhookTrigger({ models, payload, limitService });

      assert.equal(constructedWebhookTrigger.request, require('@tryghost/request'));
    });
  });

  describe('trigger', function () {
    it('does not trigger payload handler when there are no hooks registered for an event', async function () {
      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
        .resolves({ models: [] });

      await webhookTrigger.trigger(WEBHOOK_EVENT);

      sinon.assert.called(models.Webhook.findAllByEvent);
      sinon.assert.notCalled(payload);
      sinon.assert.notCalled(request);
    });

    it('does not trigger payload handler when there are hooks registered for an event, but the custom integrations limit is active', async function () {
      const webhookModel = {
        get: sinon.stub(),
        related: sinon.stub(),
      };

      webhookModel.get
        .withArgs('event')
        .returns(WEBHOOK_EVENT)
        .withArgs('target_url')
        .returns(WEBHOOK_TARGET_URL);

      webhookModel.related.withArgs('integration').returns(null);

      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true }, withRelated: ['integration'] })
        .resolves({ models: [webhookModel] });

      limitService.isLimited.withArgs('customIntegrations').returns(true);
      limitService.checkWouldGoOverLimit.withArgs('customIntegrations').resolves(true);

      await webhookTrigger.trigger(WEBHOOK_EVENT);

      sinon.assert.called(models.Webhook.findAllByEvent);
      sinon.assert.notCalled(payload);
      sinon.assert.notCalled(request);
    });

    it('triggers payload handler when there are hooks registered for an event', async function () {
      const webhookModel = {
        get: sinon.stub(),
      };

      webhookModel.get
        .withArgs('event')
        .returns(WEBHOOK_EVENT)
        .withArgs('target_url')
        .returns(WEBHOOK_TARGET_URL);

      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
        .resolves({ models: [webhookModel] });

      const postModel = sinon.stub();

      payload.withArgs(WEBHOOK_EVENT, postModel).resolves({ data: [1] });

      await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

      sinon.assert.called(models.Webhook.findAllByEvent);
      sinon.assert.called(payload);
      sinon.assert.called(request);
      assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);
      const reqBody = JSON.parse(request.args[0][1].body);
      assert.deepEqual(reqBody, {
        event: WEBHOOK_EVENT,
        data: [1],
      });
      assert.deepEqual(Object.keys(request.args[0][1].headers), [
        'Content-Length',
        'Content-Type',
        'Content-Version',
      ]);
      assert.equal(
        request.args[0][1].headers['Content-Length'],
        Buffer.byteLength(request.args[0][1].body),
      );
      assert.equal(request.args[0][1].headers['Content-Type'], 'application/json');
      assert.match(request.args[0][1].headers['Content-Version'], /v\d+\.\d+/);
    });

    it('builds the payload once for every webhook registered for an event', async function () {
      const webhookFor = (url) => {
        const get = sinon.stub();
        get.withArgs('event').returns(WEBHOOK_EVENT);
        get.withArgs('target_url').returns(url);
        return { get };
      };
      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
        .resolves({
          models: [webhookFor('http://one.example.com'), webhookFor('http://two.example.com')],
        });

      const postModel = sinon.stub();
      payload.withArgs(WEBHOOK_EVENT, postModel).resolves({ data: [1] });

      await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

      sinon.assert.calledOnce(payload);
      sinon.assert.calledTwice(request);
      assert.deepEqual(JSON.parse(request.args[1][1].body), { event: WEBHOOK_EVENT, data: [1] });
    });

    it('logs and sends nothing when the payload cannot be built', async function () {
      const loggingStub = sinon.stub(logging, 'error');
      try {
        const webhookModel = {
          get: sinon.stub().withArgs('event').returns(WEBHOOK_EVENT),
        };
        models.Webhook.findAllByEvent
          .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
          .resolves({ models: [webhookModel] });
        const failure = new Error('the payload could not be read');
        payload.rejects(failure);

        await webhookTrigger.trigger(WEBHOOK_EVENT, sinon.stub());

        sinon.assert.notCalled(request);
        sinon.assert.calledOnce(loggingStub);
        assert.equal(loggingStub.args[0][0].err, failure);
      } finally {
        loggingStub.restore();
      }
    });

    it('includes a signature header when a webhook has a secret', async function () {
      const webhookModel = {
        get: sinon.stub(),
      };

      webhookModel.get
        .withArgs('event')
        .returns(WEBHOOK_EVENT)
        .withArgs('target_url')
        .returns(WEBHOOK_TARGET_URL)
        .withArgs('secret')
        .returns(WEBHOOK_SECRET);

      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
        .resolves({ models: [webhookModel] });

      const postModel = sinon.stub();

      payload.withArgs(WEBHOOK_EVENT, postModel).resolves({ data: [1] });

      await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

      sinon.assert.called(models.Webhook.findAllByEvent);
      sinon.assert.called(payload);
      sinon.assert.called(request);
      assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);

      const header = request.args[0][1].headers[SIGNATURE_HEADER];
      assert.equal(SIGNATURE_REGEX.test(header), true);
    });

    it('uses the request payload and a timestamp to generate the hash in the signature header', async function () {
      const clock = sinon.useFakeTimers();
      try {
        const ts = Date.now();
        const webhookModel = {
          get: sinon.stub(),
        };

        webhookModel.get
          .withArgs('event')
          .returns(WEBHOOK_EVENT)
          .withArgs('target_url')
          .returns(WEBHOOK_TARGET_URL)
          .withArgs('secret')
          .returns(WEBHOOK_SECRET);

        models.Webhook.findAllByEvent
          .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
          .resolves({ models: [webhookModel] });

        const postModel = sinon.stub();

        payload.withArgs(WEBHOOK_EVENT, postModel).resolves({ data: [1] });

        await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

        sinon.assert.called(models.Webhook.findAllByEvent);
        sinon.assert.called(payload);
        sinon.assert.called(request);
        assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);
        const expectedPayload = JSON.stringify({
          event: WEBHOOK_EVENT,
          data: [1],
        });
        const expectedHeader = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${expectedPayload}${ts}`).digest('hex')}, t=${ts}`;
        const header = request.args[0][1].headers[SIGNATURE_HEADER];
        assert.equal(expectedHeader, header);
      } finally {
        // Restored on failure too, so the fake clock can't leak into the next test.
        clock.restore();
      }
    });

    it('includes the event name in the JSON payload', async function () {
      const webhookModel = {
        get: sinon.stub(),
      };

      webhookModel.get
        .withArgs('event')
        .returns(WEBHOOK_EVENT)
        .withArgs('target_url')
        .returns(WEBHOOK_TARGET_URL)
        .withArgs('secret')
        .returns('');

      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
        .resolves({ models: [webhookModel] });

      const postModel = sinon.stub();

      payload.withArgs(WEBHOOK_EVENT, postModel).resolves({ data: [1] });

      await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

      const reqBody = request.args[0][1].body;
      const parsed = JSON.parse(reqBody);

      assert.equal(parsed.event, WEBHOOK_EVENT);
    });
  });

  describe('onError', function () {
    let loggingStub;
    let errorTrigger;

    beforeEach(function () {
      loggingStub = sinon.stub(logging, 'error');
      errorTrigger = new WebhookTrigger({ models, payload, request, limitService });
    });

    afterEach(function () {
      loggingStub.restore();
    });

    it('logs a structured error for failed webhook deliveries', function () {
      const webhookModel = {
        id: 'abc123',
        get: sinon.stub(),
      };
      webhookModel.get
        .withArgs('event')
        .returns('post.added')
        .withArgs('target_url')
        .returns('https://example.com/hook');

      const err = new Error('URL resolves to a non-permitted private IP block');
      err.statusCode = 500;
      err.code = 'URL_PRIVATE_INVALID';

      errorTrigger.onError(webhookModel)(err);

      sinon.assert.calledOnce(loggingStub);

      // Example output:
      // [WEBHOOK_DELIVERY_FAILURE] url=https://example.com/hook status=500 error_code=URL_PRIVATE_INVALID message=URL resolves to a non-permitted private IP block
      const logLine = loggingStub.args[0][0];
      assert.ok(
        logLine.startsWith('[WEBHOOK_DELIVERY_FAILURE]'),
        'Log line must start with [WEBHOOK_DELIVERY_FAILURE] prefix',
      );
      assert.ok(logLine.includes('url=https://example.com/hook'));
      assert.ok(logLine.includes('status=500'));
      assert.ok(logLine.includes('error_code=URL_PRIVATE_INVALID'));
      assert.ok(logLine.includes('message=URL resolves to a non-permitted private IP block'));
      assert.equal(
        loggingStub.args[0][1],
        err,
        'Error object must be passed as second argument for stack/metadata',
      );
    });

    it('logs with fallback values when error properties are missing', function () {
      const webhookModel = {
        id: 'abc123',
        get: sinon.stub(),
      };
      webhookModel.get.withArgs('event').returns('post.added').withArgs('target_url').returns(null);

      const err = new Error();

      errorTrigger.onError(webhookModel)(err);

      const logLine = loggingStub.args[0][0];
      assert.ok(logLine.includes('url=unknown'));
      assert.ok(logLine.includes('status=none'));
      assert.ok(logLine.includes('error_code=unknown'));
    });
  });

  describe('delivery', function () {
    const sandbox = sinon.createSandbox();
    let deliveryTrigger;
    let log;

    function webhookFor(url, { id = 'webhook-id', secret } = {}) {
      const attributes = { event: WEBHOOK_EVENT, target_url: url, secret };
      return { id, get: (key) => attributes[key] };
    }

    function hooks(...webhooks) {
      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
        .resolves({ models: webhooks });
    }

    beforeEach(function () {
      log = {
        info: sandbox.stub(logging, 'info'),
        warn: sandbox.stub(logging, 'warn'),
        error: sandbox.stub(logging, 'error'),
      };
      payload.resolves({ post: { current: { id: 'post-id' }, previous: {} } });
      deliveryTrigger = new WebhookTrigger({ models, payload, request, limitService });
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('posts the JSON body with a two second timeout and no retries under test', async function () {
      hooks(webhookFor(WEBHOOK_TARGET_URL));

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.calledOnce(request);
      const body = JSON.stringify({
        event: WEBHOOK_EVENT,
        post: { current: { id: 'post-id' }, previous: {} },
      });
      assert.deepEqual(request.args[0], [
        WEBHOOK_TARGET_URL,
        {
          method: 'POST',
          body,
          headers: {
            'Content-Length': Buffer.byteLength(body),
            'Content-Type': 'application/json',
            'Content-Version': `v${ghostVersion.safe}`,
          },
          timeout: { request: 2000 },
          retry: { limit: 0 },
        },
      ]);
    });

    it('asks for five retries outside the test environment', async function () {
      hooks(webhookFor(WEBHOOK_TARGET_URL));
      const environment = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await deliveryTrigger.trigger(WEBHOOK_EVENT, {});
      } finally {
        process.env.NODE_ENV = environment;
      }

      assert.deepEqual(request.args[0][1].retry, { limit: 5 });
    });

    it('records the status and time of a delivery without waiting for the write', async function () {
      const clock = sandbox.useFakeTimers({ now: 1767225600000, toFake: ['Date'] });
      hooks(webhookFor(WEBHOOK_TARGET_URL));
      request.resolves({ statusCode: 202 });
      // A write that never settles: the trigger does not wait for it.
      models.Webhook.edit.returns(new Promise(() => {}));

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.calledOnceWithExactly(
        models.Webhook.edit,
        {
          last_triggered_at: clock.now,
          last_triggered_status: 202,
          last_triggered_error: null,
        },
        { id: 'webhook-id', autoRefresh: false },
      );
    });

    it('warns when the last-triggered write fails', async function () {
      hooks(webhookFor(WEBHOOK_TARGET_URL));
      models.Webhook.edit.rejects(new Error('database unavailable'));

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});
      await setImmediate();

      sinon.assert.calledOnceWithExactly(
        log.warn,
        'Unable to update "last_triggered" for webhook: webhook-id',
      );
    });

    it('records and logs a failed delivery, then delivers to the next webhook', async function () {
      hooks(
        webhookFor('https://one.example.com', { id: 'one' }),
        webhookFor('https://two.example.com', { id: 'two' }),
      );
      const failure = Object.assign(new Error('socket hang up'), {
        statusCode: 500,
        code: 'ECONNRESET',
      });
      request.onFirstCall().rejects(failure);
      request.onSecondCall().resolves({ statusCode: 200 });

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.calledTwice(request);
      assert.deepEqual(
        models.Webhook.edit.args.map(([data, options]) => [
          options.id,
          data.last_triggered_status,
          data.last_triggered_error,
        ]),
        [
          ['one', 500, 'Request failed: ECONNRESET'],
          ['two', 200, null],
        ],
      );
      sinon.assert.calledOnceWithExactly(
        log.error,
        '[WEBHOOK_DELIVERY_FAILURE] url=https://one.example.com status=500 error_code=ECONNRESET message=socket hang up',
        failure,
      );
    });

    it('records an unknown failure when the error has no code or status', async function () {
      hooks(webhookFor(WEBHOOK_TARGET_URL));
      request.rejects(new Error('boom'));

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      const [data] = models.Webhook.edit.args[0];
      assert.equal(data.last_triggered_status, undefined);
      assert.equal(data.last_triggered_error, 'Request failed: unknown');
    });

    it('destroys a webhook whose target answers 410 and waits for the removal', async function () {
      hooks(webhookFor(WEBHOOK_TARGET_URL));
      request.rejects(Object.assign(new Error('Gone'), { statusCode: 410 }));
      const removal = Promise.withResolvers();
      models.Webhook.destroy.returns(removal.promise);
      let settled = false;

      const triggered = deliveryTrigger.trigger(WEBHOOK_EVENT, {}).then(() => {
        settled = true;
      });
      await setImmediate();

      sinon.assert.calledOnceWithExactly(
        models.Webhook.destroy,
        { id: 'webhook-id' },
        { context: { internal: true } },
      );
      assert.equal(settled, false);
      removal.resolve(null);
      await triggered;

      sinon.assert.notCalled(models.Webhook.edit);
      sinon.assert.notCalled(log.error);
      sinon.assert.calledWithExactly(
        log.info,
        `Webhook destroyed (410 response) for "${WEBHOOK_EVENT}" with url "${WEBHOOK_TARGET_URL}".`,
      );
    });

    it('warns when a 410 removal fails', async function () {
      hooks(webhookFor(WEBHOOK_TARGET_URL));
      request.rejects(Object.assign(new Error('Gone'), { statusCode: 410 }));
      models.Webhook.destroy.rejects(new Error('database unavailable'));

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.calledOnceWithExactly(log.warn, 'Unable to destroy webhook webhook-id.');
    });

    it('delivers to one webhook at a time', async function () {
      hooks(webhookFor('https://one.example.com'), webhookFor('https://two.example.com'));
      const first = Promise.withResolvers();
      request.onFirstCall().returns(first.promise);
      request.onSecondCall().resolves({ statusCode: 200 });

      const triggered = deliveryTrigger.trigger(WEBHOOK_EVENT, {});
      await setImmediate();

      sinon.assert.calledOnce(request);
      first.resolve({ statusCode: 200 });
      await triggered;

      sinon.assert.calledTwice(request);
      assert.equal(request.args[1][0], 'https://two.example.com');
    });

    it('logs and sends nothing when the webhooks cannot be looked up', async function () {
      const failure = new Error('database unavailable');
      models.Webhook.findAllByEvent.rejects(failure);

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.notCalled(payload);
      sinon.assert.notCalled(request);
      sinon.assert.calledOnceWithExactly(
        log.error,
        { event: { name: 'webhooks.trigger.failed' }, err: failure, webhookEvent: WEBHOOK_EVENT },
        'Failed to prepare webhooks for an event, so none were sent',
      );
    });

    it('delivers only to internal integrations while the custom integrations limit is reached', async function () {
      limitService.isLimited.withArgs('customIntegrations').returns(true);
      limitService.checkWouldGoOverLimit.withArgs('customIntegrations').resolves(true);
      const withIntegration = (url, type) => ({
        ...webhookFor(url),
        related: (relation) => relation === 'integration' && { get: () => type },
      });
      models.Webhook.findAllByEvent
        .withArgs(WEBHOOK_EVENT, { context: { internal: true }, withRelated: ['integration'] })
        .resolves({
          models: [
            withIntegration('https://internal.example.com', 'internal'),
            withIntegration('https://custom.example.com', 'custom'),
          ],
        });

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.calledOnce(request);
      assert.equal(request.args[0][0], 'https://internal.example.com');
      sinon.assert.calledWithExactly(
        log.info,
        `Skipping all non-internal webhooks for event ${WEBHOOK_EVENT}. The "customIntegrations" plan limit is enabled.`,
      );
    });

    it('delivers to every webhook while the limit is enabled but not reached', async function () {
      limitService.isLimited.withArgs('customIntegrations').returns(true);
      limitService.checkWouldGoOverLimit.withArgs('customIntegrations').resolves(false);
      hooks(webhookFor('https://custom.example.com'));

      await deliveryTrigger.trigger(WEBHOOK_EVENT, {});

      sinon.assert.calledOnce(request);
      assert.equal(request.args[0][0], 'https://custom.example.com');
    });
  });
});
