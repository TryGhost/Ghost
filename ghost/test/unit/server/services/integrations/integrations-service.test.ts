import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { NotFoundError, InternalServerError } from '@tryghost/errors';

const createService = require('../../../../../core/server/services/integrations/integrations-service');

describe('Integrations service', function () {
  const sandbox = sinon.createSandbox();
  let IntegrationModel: { edit: sinon.SinonStub; findOne: sinon.SinonStub };
  let ApiKeyModel: { findOne: sinon.SinonStub; refreshSecret: sinon.SinonStub };
  let service: ReturnType<typeof createService>;

  beforeEach(function () {
    IntegrationModel = { edit: sandbox.stub(), findOne: sandbox.stub() };
    ApiKeyModel = { findOne: sandbox.stub(), refreshSecret: sandbox.stub().resolves() };
    service = createService({ IntegrationModel, ApiKeyModel });
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('constructs independent instances that borrow models without querying them', function () {
    const other = createService({ IntegrationModel, ApiKeyModel });
    assert.notEqual(service, other);
    assert.equal(service.IntegrationModel, IntegrationModel);
    assert.equal(service.ApiKeyModel, ApiKeyModel);
    assert.equal(other.IntegrationModel, IntegrationModel);
    assert.equal(other.ApiKeyModel, ApiKeyModel);
    sinon.assert.notCalled(IntegrationModel.edit);
    sinon.assert.notCalled(IntegrationModel.findOne);
    sinon.assert.notCalled(ApiKeyModel.findOne);
    sinon.assert.notCalled(ApiKeyModel.refreshSecret);
  });

  it('forwards ordinary edits with the same data and options, adding require in place', async function () {
    const data = { name: 'Updated integration', webhooks: [{ id: 'webhook-id' }] };
    const options = { id: 'integration-id', context: { user: 'owner-id' }, require: false };
    const result = { id: options.id, name: data.name };
    IntegrationModel.edit.resolves(result);

    assert.equal(await service.edit(data, options), result);
    assert.equal(options.require, true);
    sinon.assert.calledOnceWithExactly(IntegrationModel.edit, data, options);
    sinon.assert.calledOn(IntegrationModel.edit, IntegrationModel);
    sinon.assert.notCalled(ApiKeyModel.findOne);
    sinon.assert.notCalled(IntegrationModel.findOne);
  });

  it.each(['NotFound', 'EmptyResponse'])(
    'translates ordinary %s failures',
    async function (message) {
      IntegrationModel.edit.rejects(new Error(message));
      await assert.rejects(service.edit({}, { id: 'missing-integration' }), (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.equal(error.message, 'Integration not found.');
        return true;
      });
    },
  );

  it('preserves other ordinary edit failures', async function () {
    const failure = new Error('Database unavailable');
    IntegrationModel.edit.rejects(failure);
    await assert.rejects(service.edit({}, {}), (error) => error === failure);
  });

  it.each(['admin', 'content'])(
    'rotates a %s key before rereading current integration relations',
    async function (type) {
      const keyData = {
        id: 'key-id',
        type,
        integration_id: 'integration-id',
        secret: 'old-secret',
      };
      const key = { toJSON: sandbox.stub().returns(keyData) };
      const transacting = { transaction: 'caller-transaction' };
      const options = {
        id: 'integration-id',
        keyid: keyData.id,
        context: { user: 'owner-id' },
        transacting,
      };
      const originalOptions = { ...options };
      const result = { id: options.id, api_keys: [{ ...keyData, secret: 'new-secret' }] };
      ApiKeyModel.findOne.resolves(key);
      IntegrationModel.findOne.resolves(result);

      assert.equal(await service.edit({ name: 'Ignored during rotation' }, options), result);
      sinon.assert.calledOnceWithExactly(ApiKeyModel.findOne, { id: keyData.id });
      sinon.assert.calledOn(ApiKeyModel.findOne, ApiKeyModel);
      sinon.assert.calledOnce(key.toJSON);
      sinon.assert.calledOn(key.toJSON, key);
      sinon.assert.calledOnceWithExactly(ApiKeyModel.refreshSecret, keyData, {
        ...options,
        id: keyData.id,
      });
      assert.notEqual(ApiKeyModel.refreshSecret.firstCall.args[1], options);
      assert.equal(ApiKeyModel.refreshSecret.firstCall.args[1].transacting, transacting);
      sinon.assert.calledOn(ApiKeyModel.refreshSecret, ApiKeyModel);
      sinon.assert.calledOnceWithExactly(
        IntegrationModel.findOne,
        { id: options.id },
        { withRelated: ['api_keys', 'webhooks'] },
      );
      sinon.assert.calledOn(IntegrationModel.findOne, IntegrationModel);
      sinon.assert.callOrder(
        ApiKeyModel.findOne,
        ApiKeyModel.refreshSecret,
        IntegrationModel.findOne,
      );
      sinon.assert.notCalled(IntegrationModel.edit);
      assert.deepEqual(options, originalOptions);
    },
  );

  it('rejects a missing key without refreshing it or rereading the integration', async function () {
    ApiKeyModel.findOne.resolves(null);
    await assert.rejects(
      service.edit({}, { id: 'integration-id', keyid: 'missing-key' }),
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.equal(error.message, 'ApiKey not found.');
        return true;
      },
    );
    sinon.assert.notCalled(ApiKeyModel.refreshSecret);
    sinon.assert.notCalled(IntegrationModel.findOne);
  });

  it('preserves key lookup failures before entering the rotation catch', async function () {
    const failure = new Error('Key lookup failed');
    ApiKeyModel.findOne.rejects(failure);
    await assert.rejects(service.edit({}, { keyid: 'key-id' }), (error) => error === failure);
    sinon.assert.notCalled(ApiKeyModel.refreshSecret);
    sinon.assert.notCalled(IntegrationModel.findOne);
  });

  it.each(['serialization', 'refresh', 'reread'])(
    'wraps rotation %s failures',
    async function (stage) {
      const failure = new Error(`Failed ${stage}`);
      const toJSON = sandbox.stub().returns({ id: 'key-id' });
      ApiKeyModel.findOne.resolves({ toJSON });
      if (stage === 'serialization') {
        toJSON.throws(failure);
      } else if (stage === 'refresh') {
        ApiKeyModel.refreshSecret.rejects(failure);
      } else {
        IntegrationModel.findOne.rejects(failure);
      }

      await assert.rejects(service.edit({}, { id: 'integration-id', keyid: 'key-id' }), (error) => {
        assert.ok(error instanceof InternalServerError);
        assert.equal(error.message, 'The server has encountered an error.');
        assert.equal(error.statusCode, 500);
        return true;
      });
      if (stage !== 'reread') {
        sinon.assert.notCalled(IntegrationModel.findOne);
      }
    },
  );

  it('returns a null integration reread after a successful key refresh', async function () {
    ApiKeyModel.findOne.resolves({ toJSON: () => ({ id: 'key-id' }) });
    IntegrationModel.findOne.resolves(null);
    assert.equal(await service.edit({}, { id: 'missing-integration', keyid: 'key-id' }), null);
    sinon.assert.calledOnce(ApiKeyModel.refreshSecret);
  });

  it('waits for refresh before starting the reread and waits for that reread', async function () {
    const refresh = Promise.withResolvers<void>();
    const reread = Promise.withResolvers<object>();
    const result = { id: 'integration-id' };
    ApiKeyModel.findOne.resolves({ toJSON: () => ({ id: 'key-id' }) });
    ApiKeyModel.refreshSecret.returns(refresh.promise);
    IntegrationModel.findOne.returns(reread.promise);
    let settled = false;
    const editing = service.edit({}, { id: result.id, keyid: 'key-id' }).finally(() => {
      settled = true;
    });

    try {
      await setImmediate();
      sinon.assert.calledOnce(ApiKeyModel.refreshSecret);
      sinon.assert.notCalled(IntegrationModel.findOne);
      assert.equal(settled, false);
      refresh.resolve();
      await setImmediate();
      sinon.assert.calledOnce(IntegrationModel.findOne);
      assert.equal(settled, false);
    } finally {
      refresh.resolve();
      reread.resolve(result);
      assert.equal(await editing, result);
    }
    assert.equal(settled, true);
  });
});
