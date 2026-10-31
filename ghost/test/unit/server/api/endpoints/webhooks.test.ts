import assert from 'node:assert/strict';
import sinon from 'sinon';

// require, not import: the endpoint is CommonJS and must see the same models object.
const models = require('../../../../../core/server/models');

describe('Webhooks Admin endpoint', function () {
  const endpointPath = require.resolve('../../../../../core/server/api/endpoints/webhooks');
  let savedEndpoint: NodeJS.Module | undefined;
  let savedWebhookModel: unknown;
  let Webhook: { getByEventAndTarget: sinon.SinonStub; add: sinon.SinonStub };

  const data = {
    webhooks: [{ event: 'post.published', target_url: 'https://receiver.example/hook' }],
  };
  const options = { context: { integration: { id: 'integration-id' } } };

  function loadEndpoint() {
    return require(endpointPath);
  }

  beforeEach(function () {
    savedEndpoint = require.cache[endpointPath];
    delete require.cache[endpointPath];
    savedWebhookModel = models.Webhook;
    Webhook = { getByEventAndTarget: sinon.stub(), add: sinon.stub() };
    models.Webhook = Webhook;
  });

  afterEach(function () {
    models.Webhook = savedWebhookModel;
    delete require.cache[endpointPath];
    if (savedEndpoint) {
      require.cache[endpointPath] = savedEndpoint;
    }
  });

  it('adds a webhook through the management service, which reads the Webhook model per call', async function () {
    const endpoint = loadEndpoint();
    // Replaced after the endpoint is loaded: the service keeps the model, not its methods.
    const created = { id: 'webhook-id' };
    Webhook.getByEventAndTarget = sinon.stub().resolves(null);
    Webhook.add = sinon.stub().resolves(created);

    const result = await endpoint.add.query({ data, options });

    assert.equal(result, created);
    sinon.assert.calledOnceWithExactly(
      Webhook.getByEventAndTarget,
      'post.published',
      'https://receiver.example/hook',
      options,
    );
    sinon.assert.calledOnceWithExactly(Webhook.add, data.webhooks[0], options);
    sinon.assert.callOrder(Webhook.getByEventAndTarget, Webhook.add);
  });

  it('rejects a target already used for the event without adding it', async function () {
    const endpoint = loadEndpoint();
    Webhook.getByEventAndTarget.resolves({ id: 'existing' });

    await assert.rejects(endpoint.add.query({ data, options }), {
      errorType: 'ValidationError',
      message: 'Target URL has already been used for this event.',
    });
    sinon.assert.notCalled(Webhook.add);
  });

  for (const [label, failure] of [
    ['MySQL', { errno: 1452 }],
    ['SQLite', { code: 'SQLITE_CONSTRAINT', message: 'FOREIGN KEY constraint failed' }],
    ['SQLite foreign key', { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' }],
  ] as const) {
    it(`reports a missing integration from a ${label} foreign key failure`, async function () {
      const endpoint = loadEndpoint();
      Webhook.getByEventAndTarget.resolves(null);
      Webhook.add.rejects(Object.assign(new Error('constraint'), failure));

      await assert.rejects(endpoint.add.query({ data, options }), {
        errorType: 'ValidationError',
        message: "Validation failed for 'integration_id'.",
        context: "'integration_id' value does not match any existing integration.",
        help: "Provide the 'integration_id' of an existing integration.",
      });
    });
  }

  it('rethrows other add failures unchanged', async function () {
    const endpoint = loadEndpoint();
    const failure = Object.assign(new Error('SQLITE_CONSTRAINT: UNIQUE'), {
      code: 'SQLITE_CONSTRAINT',
    });
    Webhook.getByEventAndTarget.resolves(null);
    Webhook.add.rejects(failure);

    await assert.rejects(endpoint.add.query({ data, options }), (error) => error === failure);
  });
});
