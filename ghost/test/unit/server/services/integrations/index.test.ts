import assert from 'node:assert/strict';
import sinon from 'sinon';

const factoryPath =
  require.resolve('../../../../../core/server/services/integrations/integrations-service');
const endpointPath = require.resolve('../../../../../core/server/api/endpoints/integrations');
const createService = require(factoryPath);
const models = require('../../../../../core/server/models');

describe('Integrations with its retained endpoint', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeJS.Module | undefined>;
  let factory: sinon.SinonSpy;
  let endpoint: ReturnType<typeof require>;
  let edit: sinon.SinonStub;
  let findIntegration: sinon.SinonStub;
  let findKey: sinon.SinonStub;
  let refreshSecret: sinon.SinonStub;

  beforeEach(function () {
    previousModules = new Map(
      [factoryPath, endpointPath].map((path) => [path, require.cache[path]]),
    );
    delete require.cache[endpointPath];
    edit = sandbox.stub(models.Integration, 'edit');
    findIntegration = sandbox.stub(models.Integration, 'findOne');
    findKey = sandbox.stub(models.ApiKey, 'findOne');
    refreshSecret = sandbox.stub(models.ApiKey, 'refreshSecret');
    factory = sandbox.spy(createService);
    sandbox.replace(require.cache[factoryPath]!, 'exports', factory);
    // Load the real endpoint and retain the actual service created by the real factory.
    endpoint = require(endpointPath);
  });

  afterEach(function () {
    sandbox.restore();
    for (const [path, previous] of previousModules) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  it('constructs once at endpoint import without querying either borrowed model', function () {
    sinon.assert.calledOnceWithExactly(factory, {
      IntegrationModel: models.Integration,
      ApiKeyModel: models.ApiKey,
    });
    sinon.assert.notCalled(edit);
    sinon.assert.notCalled(findIntegration);
    sinon.assert.notCalled(findKey);
    sinon.assert.notCalled(refreshSecret);
    assert.equal(require(endpointPath), endpoint);
    sinon.assert.calledOnce(factory);
  });

  it('uses the retained real instance and receiver across edits, reading current model results', async function () {
    const instance = factory.firstCall.returnValue;
    const serviceEdit = sandbox.spy(instance, 'edit');
    const frame = { data: { name: 'Updated integration' }, options: { id: 'integration-id' } };
    const first = { id: frame.options.id, name: 'First result' };
    const second = { id: frame.options.id, name: 'Second result' };
    edit.onFirstCall().resolves(first);
    edit.onSecondCall().resolves(second);

    assert.equal(await endpoint.edit.query(frame), first);
    assert.equal(await endpoint.edit.query(frame), second);
    sinon.assert.calledTwice(serviceEdit);
    sinon.assert.alwaysCalledOn(serviceEdit, instance);
    sinon.assert.alwaysCalledWithExactly(serviceEdit, frame.data, frame.options);
    sinon.assert.alwaysCalledOn(edit, models.Integration);
    sinon.assert.calledOnce(factory);
  });

  it('forwards rotation through that same retained instance', async function () {
    const instance = factory.firstCall.returnValue;
    const serviceEdit = sandbox.spy(instance, 'edit');
    const result = { id: 'integration-id', api_keys: [{ id: 'key-id', secret: 'new-secret' }] };
    const keyData = { id: 'key-id', type: 'admin', secret: 'old-secret' };
    findKey.resolves({ toJSON: () => keyData });
    refreshSecret.resolves();
    findIntegration.resolves(result);
    const options = { id: result.id, keyid: keyData.id };

    assert.equal(await endpoint.edit.query({ data: {}, options }), result);
    sinon.assert.calledOnceWithExactly(refreshSecret, keyData, { ...options, id: keyData.id });
    sinon.assert.calledOnce(serviceEdit);
    sinon.assert.alwaysCalledOn(serviceEdit, instance);
    sinon.assert.calledOnce(factory);
  });

  it('keeps an ordinary endpoint edit pending and propagates the model rejection unchanged', async function () {
    const pending = Promise.withResolvers<object>();
    const failure = new Error('Model edit failed');
    edit.returns(pending.promise);
    let settled = false;
    const editing = endpoint.edit
      .query({ data: {}, options: { id: 'integration-id' } })
      .finally(() => {
        settled = true;
      });
    const rejected = assert.rejects(editing, (error) => error === failure);
    try {
      await Promise.resolve();
      sinon.assert.calledOnce(edit);
      assert.equal(settled, false);
    } finally {
      pending.reject(failure);
      await rejected;
    }
    assert.equal(settled, true);
  });
});
