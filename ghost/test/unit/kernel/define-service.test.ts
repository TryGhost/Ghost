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

    assert.deepEqual(Object.keys(root).sort(), ['init', 'service', 'stop']);
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
    assert.deepEqual(Object.keys(root).sort(), ['extras', 'init', 'service', 'stop']);
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

  describe('lifecycle hooks', function () {
    it('publishes the instance only after start resolves', async function () {
      const instance = { value: 42 };
      const started = Promise.withResolvers<void>();
      const create = sinon.stub().returns(instance);
      const start = sinon.stub().returns(started.promise);
      const root = defineService('Example', {
        create: () => create() as typeof instance,
        start: (service) => {
          expectTypeOf(service).toEqualTypeOf<typeof instance>();
          return start(service);
        },
      });
      expectTypeOf<typeof root.service>().toEqualTypeOf<typeof instance>();

      const startup = root.init();
      // Preserve boot ordering: a synchronous factory still runs as init is called.
      sinon.assert.calledOnce(create);
      try {
        await Promise.resolve();
        sinon.assert.calledOnceWithExactly(start, instance);
        assert.throws(() => root.service, IncorrectUsageError);
      } finally {
        started.resolve();
        await startup;
      }
      assert.equal(root.service, instance);
    });

    it('stops the started instance once and keeps it readable', async function () {
      const instance = {};
      const stop = sinon.stub();
      const root = defineService('Example', { create: () => instance, stop });

      await root.stop();
      sinon.assert.notCalled(stop);

      await root.init();
      await Promise.all([root.stop(), root.stop()]);
      sinon.assert.calledOnceWithExactly(stop, instance);
      assert.equal(root.service, instance);

      await root.stop();
      sinon.assert.calledOnce(stop);
    });

    it('starts the same instance again when init follows stop', async function () {
      const instance = {};
      const create = sinon.stub().returns(instance);
      const start = sinon.stub();
      const stop = sinon.stub();
      const root = defineService('Example', { create, start, stop });

      await root.init();
      await root.init();
      sinon.assert.calledOnce(start);
      await root.stop();
      await root.init();

      sinon.assert.calledOnce(create);
      sinon.assert.calledTwice(start);
      sinon.assert.alwaysCalledWithExactly(start, instance);
      sinon.assert.callOrder(create, start, stop, start);
      assert.equal(root.service, instance);
    });

    it('cleans up a failed start with stop and retries start without creating again', async function () {
      const failure = new Error('Start failed');
      const instance = {};
      const create = sinon.stub().returns(instance);
      const start = sinon.stub().onFirstCall().rejects(failure);
      const stop = sinon.stub();
      const root = defineService('Example', { create, start, stop });

      await assert.rejects(root.init(), (error) => error === failure);
      sinon.assert.calledOnceWithExactly(stop, instance);
      assert.throws(() => root.service, IncorrectUsageError);

      // The failed start was already cleaned up, so there is nothing left to stop.
      await root.stop();
      sinon.assert.calledOnce(stop);

      await root.init();
      assert.equal(root.service, instance);
      sinon.assert.calledOnce(create);
      sinon.assert.calledTwice(start);
      sinon.assert.calledOnce(stop);
    });

    it('rejects stop with the hook error and permits a later restart', async function () {
      const failure = new Error('Stop failed');
      const start = sinon.stub();
      const stop = sinon.stub().onFirstCall().rejects(failure);
      const root = defineService('Example', { create: () => ({}), start, stop });

      await root.init();
      await assert.rejects(root.stop(), (error) => error === failure);
      await root.init();
      sinon.assert.calledTwice(start);
      await root.stop();
      sinon.assert.calledTwice(stop);
    });

    it('gives a root without hooks a stop that neither fails nor creates again', async function () {
      const instance = {};
      const create = sinon.stub().returns(instance);
      const root = defineService('Example', create);

      await root.init();
      await root.stop();
      await root.init();
      assert.equal(root.service, instance);
      sinon.assert.calledOnce(create);
    });
  });
});
