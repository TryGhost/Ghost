import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';
import { defineService } from '../../../../core/server/lib/define-service';

describe('defineService', function () {
  it('constructs only at init and reuses the ready instance', async function () {
    const instance = {};
    const create = sinon.stub().returns(instance);
    const service = defineService('Example', create);

    sinon.assert.notCalled(create);
    assert.throws(() => service.getInstance(), {
      name: 'IncorrectUsageError',
      message: 'Example used before init(). Call init() from boot first.',
    });

    const startup = service.init();
    // Preserve boot ordering: a synchronous factory runs as init is called.
    sinon.assert.calledOnce(create);
    await startup;
    assert.equal(service.getInstance(), instance);
    await service.init();
    assert.equal(service.getInstance(), instance);
    sinon.assert.calledOnce(create);
  });

  it('shares pending initialization and publishes only the ready instance', async function () {
    const ready = Promise.withResolvers<object>();
    const create = sinon.stub().returns(ready.promise);
    const service = defineService('Example', create);
    const startup = service.init();
    const instance = {};
    let finished = false;
    const completion = startup.then(() => {
      finished = true;
    });

    try {
      assert.equal(service.init(), startup);
      await Promise.resolve();
      sinon.assert.calledOnce(create);
      assert.equal(finished, false);
      assert.throws(() => service.getInstance(), IncorrectUsageError);
    } finally {
      ready.resolve(instance);
      await Promise.allSettled([startup, completion]);
    }
    await startup;
    assert.equal(service.getInstance(), instance);
  });

  it('rejects with a synchronous construction error and permits a later retry', async function () {
    const failure = new Error('Construction failed');
    const instance = {};
    const create = sinon.stub().onFirstCall().throws(failure).onSecondCall().returns(instance);
    const service = defineService('Example', create);

    await assert.rejects(service.init(), (error) => error === failure);
    assert.throws(() => service.getInstance(), IncorrectUsageError);
    await service.init();
    assert.equal(service.getInstance(), instance);
    sinon.assert.calledTwice(create);
  });

  it('rejects every pending caller with the original error and retries without publishing a failed instance', async function () {
    const ready = Promise.withResolvers<object>();
    const failure = new Error('Startup failed');
    const instance = {};
    const create = sinon
      .stub()
      .onFirstCall()
      .returns(ready.promise)
      .onSecondCall()
      .returns(instance);
    const service = defineService('Example', create);
    const first = service.init();
    const second = service.init();
    const failures = Promise.all([
      assert.rejects(first, (error) => error === failure),
      assert.rejects(second, (error) => error === failure),
    ]);

    ready.reject(failure);
    await failures;
    assert.throws(() => service.getInstance(), IncorrectUsageError);
    await service.init();
    assert.equal(service.getInstance(), instance);
    sinon.assert.calledTwice(create);
  });
});
