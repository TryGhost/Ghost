import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';
import { expectTypeOf } from 'vitest';
import { defineService } from '../../../core/kernel/define-service';

describe('defineService', function () {
  it('constructs only at init and reuses the ready instance', async function () {
    const instance = {};
    const create = sinon.stub().returns(instance);
    const root = defineService('Example', create);

    assert.deepEqual(Object.keys(root).sort(), ['init', 'service']);
    sinon.assert.notCalled(create);
    assert.throws(() => root.service, {
      name: 'IncorrectUsageError',
      message: 'Example used before init(). Call init() from boot first.',
    });

    const startup = root.init();
    // Preserve boot ordering: a synchronous factory runs as init is called.
    sinon.assert.calledOnce(create);
    await startup;
    assert.equal(root.service, instance);
    await root.init();
    assert.equal(root.service, instance);
    sinon.assert.calledOnce(create);
  });

  it('exposes typed extras without constructing the service or evaluating its getter', async function () {
    const instance = { value: 42 };
    const create = sinon.stub().returns(instance);
    const isAvailable = sinon.stub<[], boolean>().returns(true);
    const extras = { isAvailable };
    const root = defineService('Example', create, extras);

    expectTypeOf(root.extras).toEqualTypeOf<typeof extras>();
    assert.deepEqual(Object.keys(root).sort(), ['extras', 'init', 'service']);
    assert.equal(root.extras, extras);
    assert.equal(typeof Object.getOwnPropertyDescriptor(root, 'service')?.get, 'function');
    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(create);
    sinon.assert.notCalled(isAvailable);
    assert.equal(root.extras.isAvailable(), true);
    sinon.assert.notCalled(create);

    await root.init();
    assert.equal(root.service, instance);
    assert.equal(root.extras, extras);
  });

  it('shares pending initialization and publishes only the ready instance', async function () {
    const ready = Promise.withResolvers<object>();
    const create = sinon.stub().returns(ready.promise);
    const root = defineService('Example', create);
    const startup = root.init();
    const instance = {};
    let finished = false;
    const completion = startup.then(() => {
      finished = true;
    });

    try {
      assert.equal(root.init(), startup);
      await Promise.resolve();
      sinon.assert.calledOnce(create);
      assert.equal(finished, false);
      assert.throws(() => root.service, IncorrectUsageError);
    } finally {
      ready.resolve(instance);
      await Promise.allSettled([startup, completion]);
    }
    await startup;
    assert.equal(root.service, instance);
  });

  it('rejects with a synchronous construction error and permits a later retry', async function () {
    const failure = new Error('Construction failed');
    const instance = {};
    const create = sinon.stub().onFirstCall().throws(failure).onSecondCall().returns(instance);
    const root = defineService('Example', create);

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);
    await root.init();
    assert.equal(root.service, instance);
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
    const root = defineService('Example', create);
    const first = root.init();
    const second = root.init();
    const failures = Promise.all([
      assert.rejects(first, (error) => error === failure),
      assert.rejects(second, (error) => error === failure),
    ]);

    ready.reject(failure);
    await failures;
    assert.throws(() => root.service, IncorrectUsageError);
    await root.init();
    assert.equal(root.service, instance);
    sinon.assert.calledTwice(create);
  });
});
