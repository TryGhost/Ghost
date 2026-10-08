import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import sinon from 'sinon';
import {
  defineService,
  type ServiceLifecycle,
} from '../../../../core/server/lib/service-lifecycle';

describe('Service lifecycle', function () {
  const sandbox = sinon.createSandbox();

  afterEach(function () {
    sandbox.restore();
  });

  function isUnavailable(error: unknown): boolean {
    return error instanceof errors.IncorrectUsageError && error.message.includes('example');
  }

  it('constructs only at init and keeps a composition-only instance without a shutdown method', async function () {
    class Example {
      #value = 3;
      snapshot = { value: 4 };

      get value() {
        return this.#value;
      }

      add(amount: number) {
        this.#value += amount;
        return this.#value;
      }
    }
    const create = sandbox.spy(() => new Example());
    const root = defineService({ name: 'example', create });
    const retained = root.service;
    assert.equal('shutdown' in root, false);
    sinon.assert.notCalled(create);
    assert.throws(() => retained.add, isUnavailable);
    assert.throws(() => retained.value, isUnavailable);
    assert.equal(await Promise.resolve(retained), retained);

    await root.init();
    const add = retained.add;
    assert.equal(add, retained.add);
    assert.equal(add(2), 5);
    assert.equal(retained.value, 5);
    assert.equal(retained.snapshot, create.firstCall.returnValue.snapshot);
    await root.init();
    sinon.assert.calledOnce(create);
    assert.equal(add(1), 6);
    assert.equal(await Promise.resolve(retained), retained);
  });

  it('joins pending creation without publishing the instance early', async function () {
    const created = Promise.withResolvers<{ value: number }>();
    const create = sandbox.spy(() => created.promise);
    const root = defineService({ name: 'example', create });
    const initialization = root.init();
    assert.equal(root.init(), initialization);
    assert.throws(() => root.service.value, isUnavailable);
    created.resolve({ value: 1 });
    await initialization;
    assert.equal(root.init(), initialization);
    assert.equal(root.service.value, 1);
    sinon.assert.calledOnce(create);
  });

  it('awaits optional startup before publishing and runs it only once', async function () {
    const started = Promise.withResolvers<void>();
    const candidate = { value: 1 };
    const start = sandbox.stub().returns(started.promise);
    const root = defineService({ name: 'example', create: () => candidate, start });
    const initialization = root.init();
    let ready = false;
    void initialization.then(() => {
      ready = true;
    });
    await setImmediate();
    sinon.assert.calledOnceWithExactly(start, candidate);
    assert.equal(ready, false);
    assert.throws(() => root.service.value, isUnavailable);
    assert.equal(root.init(), initialization);
    started.resolve();
    await initialization;
    assert.equal(root.service.value, 1);
    await root.init();
    sinon.assert.calledOnce(start);
    assert.equal('shutdown' in root, false);
  });

  it('allows a later explicit attempt after construction fails', async function () {
    const failure = new Error('construction failed');
    const create = sandbox.stub();
    create.onFirstCall().throws(failure);
    create.onSecondCall().returns({ value: 2 });
    const root = defineService<{ value: number }>({ name: 'example', create });
    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service.value, isUnavailable);
    await root.init();
    assert.equal(root.service.value, 2);
    sinon.assert.calledTwice(create);
  });

  it('stops resource owners once, then forwards retained methods to a fresh instance', async function () {
    let generation = 0;
    const create = sandbox.spy(() => {
      generation += 1;
      return {
        generation,
        snapshot: { generation },
        read() {
          return this.generation;
        },
      };
    });
    const shutdown = sandbox.spy();
    const root = defineService({ name: 'example', create, shutdown });
    assert.ok(root.shutdown);
    const stopService = root.shutdown;
    await stopService();
    sinon.assert.notCalled(create);
    sinon.assert.notCalled(shutdown);
    await root.init();
    const read = root.service.read;
    const snapshot = root.service.snapshot;
    assert.equal(read(), 1);
    const stopped = stopService();
    assert.equal(root.shutdown(), stopped);
    assert.throws(read, isUnavailable);
    assert.throws(() => root.service.snapshot, isUnavailable);
    await stopped;
    sinon.assert.calledOnceWithExactly(shutdown, create.firstCall.returnValue);
    await root.shutdown();
    sinon.assert.calledOnce(shutdown);
    await root.init();
    assert.equal(root.service.read, read);
    assert.equal(read(), 2);
    assert.equal(snapshot.generation, 1);
    assert.equal(root.service.snapshot.generation, 2);
    await stopService();
    sinon.assert.calledTwice(shutdown);
    assert.equal(shutdown.secondCall.args[0], create.secondCall.returnValue);
  });

  it('waits for pending startup and cleanup without publishing or allowing replacement', async function () {
    const started = Promise.withResolvers<void>();
    const released = Promise.withResolvers<void>();
    const candidate = { value: 1 };
    const start = sandbox.stub().returns(started.promise);
    const shutdown = sandbox.stub().returns(released.promise);
    const create = sandbox.spy(() => candidate);
    const root = defineService({ name: 'example', create, start, shutdown });
    assert.ok(root.shutdown);
    const initialization = root.init();
    const failedStart = assert.rejects(initialization, /example: initialization was interrupted/);
    await setImmediate();
    const stopped = root.shutdown();
    assert.equal(root.shutdown(), stopped);
    let finished = false;
    void stopped.then(() => {
      finished = true;
    });
    await assert.rejects(root.init(), /example: shutdown is still in progress/);
    await setImmediate();
    sinon.assert.notCalled(shutdown);
    assert.equal(finished, false);
    started.resolve();
    await setImmediate();
    sinon.assert.calledOnceWithExactly(shutdown, candidate);
    assert.equal(finished, false);
    assert.throws(() => root.service.value, isUnavailable);
    await assert.rejects(root.init(), /example: shutdown is still in progress/);
    sinon.assert.calledOnce(create);
    released.resolve();
    await failedStart;
    await stopped;
    assert.throws(() => root.service.value, isUnavailable);
    await root.init();
    sinon.assert.calledTwice(create);
    assert.equal(root.service.value, 1);
    await root.shutdown();
  });

  it('cleans up failed startup before permitting retry and preserves the original error', async function () {
    const released = Promise.withResolvers<void>();
    const failure = new Error('subscription failed');
    const create = sandbox.spy(() => ({ value: 1 }));
    const start = sandbox.stub();
    start.onFirstCall().throws(failure);
    const shutdown = sandbox.stub().returns(released.promise);
    const root = defineService({ name: 'example', create, start, shutdown });
    assert.ok(root.shutdown);
    const initialization = root.init();
    const failedStart = assert.rejects(initialization, (error) => error === failure);
    await setImmediate();
    sinon.assert.calledOnceWithExactly(shutdown, create.firstCall.returnValue);
    assert.equal(root.init(), initialization);
    assert.throws(() => root.service.value, isUnavailable);
    released.resolve();
    await failedStart;
    await root.shutdown();
    sinon.assert.calledOnce(shutdown);
    await root.init();
    sinon.assert.calledTwice(create);
    assert.equal(root.service.value, 1);
    await root.shutdown();
    sinon.assert.calledTwice(shutdown);
  });

  it('retains failed cleanup and rejects reinitialization over unreleased resources', async function () {
    const failure = new Error('cleanup failed');
    const shutdown = sandbox.stub().rejects(failure);
    const create = sandbox.spy(() => ({ value: 1 }));
    const root = defineService({ name: 'example', create, shutdown });
    assert.ok(root.shutdown);
    await root.init();
    const stopped = root.shutdown();
    assert.throws(() => root.service.value, isUnavailable);
    await assert.rejects(stopped, (error) => error === failure);
    assert.equal(root.shutdown(), stopped);
    await assert.rejects(root.init(), /example: cleanup failed/);
    sinon.assert.calledOnce(create);
    sinon.assert.calledOnce(shutdown);
  });

  for (const loggingFails of [false, true]) {
    it(`preserves a startup failure when rollback fails${loggingFails ? ' and logging fails' : ''}`, async function () {
      const failure = new Error('startup failed');
      const cleanupFailure = new Error('cleanup failed');
      const log = sandbox.stub(logging, 'error');
      if (loggingFails) {
        log.throws(new Error('logging failed'));
      }
      const shutdown = sandbox.stub().rejects(cleanupFailure);
      const root = defineService({
        name: 'example',
        create: () => ({ value: 1 }),
        start: () => {
          throw failure;
        },
        shutdown,
      });
      assert.ok(root.shutdown);
      await assert.rejects(root.init(), (error) => error === failure);
      sinon.assert.calledOnceWithExactly(log, cleanupFailure);
      await assert.rejects(root.shutdown(), (error) => error === cleanupFailure);
      await assert.rejects(root.init(), /example: cleanup failed/);
      sinon.assert.calledOnce(shutdown);
    });
  }

  it('rejects synchronous recursive initialization without constructing twice', async function () {
    let calls = 0;
    const root: ServiceLifecycle<{ value: number }> = defineService({
      name: 'example',
      async create() {
        calls += 1;
        await root.init();
        return { value: 1 };
      },
    });
    await assert.rejects(root.init(), /example: initialization called recursively/);
    assert.equal(calls, 1);
    assert.throws(() => root.service.value, isUnavailable);
  });
});
