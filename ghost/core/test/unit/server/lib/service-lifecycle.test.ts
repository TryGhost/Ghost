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

  it('retains a facade without constructing and preserves synchronous private-field methods', async function () {
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
    await root.shutdown({});
    sinon.assert.notCalled(create);
    assert.throws(() => retained.add, isUnavailable);
    assert.throws(() => retained.value, isUnavailable);
    assert.equal(await Promise.resolve(retained), retained);

    const scope = {};
    await root.init(scope);
    const add = retained.add;
    assert.equal(add, retained.add);
    assert.equal(add(2), 5);
    assert.equal(retained.value, 5);
    assert.equal(retained.snapshot, create.firstCall.returnValue.snapshot);
    assert.equal(await Promise.resolve(retained), retained);
    await root.shutdown(scope);
    assert.throws(() => add(1), isUnavailable);
    assert.throws(() => retained.snapshot, isUnavailable);
  });

  it('joins pending initialization and rejects an overlapping owner without shutting it down', async function () {
    const ready = Promise.withResolvers<{ value: number }>();
    const create = sandbox.spy(() => ready.promise);
    const root = defineService({ name: 'example', create });
    const scope = {};
    const intruder = {};
    const start = root.init(scope);
    assert.equal(root.init(scope), start);
    await assert.rejects(root.init(intruder), isUnavailable);
    await root.shutdown(intruder);
    assert.throws(() => root.service.value, isUnavailable);
    ready.resolve({ value: 1 });
    await start;
    assert.equal(root.init(scope), start);
    assert.equal(root.service.value, 1);
    sinon.assert.calledOnce(create);
    await root.shutdown(scope);
  });

  it('forwards captured methods to a new boot but leaves captured ordinary values unchanged', async function () {
    let generation = 0;
    const root = defineService({
      name: 'example',
      create: (): {
        generation: number;
        snapshot: { generation: number };
        read(): number;
      } => {
        generation += 1;
        return {
          generation,
          snapshot: { generation },
          read() {
            return this.generation;
          },
        };
      },
    });
    const first = {};
    const second = {};
    await root.init(first);
    const read = root.service.read;
    const snapshot = root.service.snapshot;
    assert.equal(read(), 1);
    await root.shutdown(first);
    await assert.rejects(root.init(first), isUnavailable);
    assert.throws(read, isUnavailable);
    await root.init(second);
    await root.shutdown(first);
    assert.equal(root.service.read, read);
    assert.equal(read(), 2);
    assert.equal(snapshot.generation, 1);
    assert.equal(root.service.snapshot.generation, 2);
    await assert.rejects(root.init(first), isUnavailable);
    await root.shutdown(second);
    await assert.rejects(root.init(first), isUnavailable);
  });

  it('waits for interrupted creation and disposes late acquisitions without publishing', async function () {
    const acquired = Promise.withResolvers<void>();
    const cleanup = Promise.withResolvers<void>();
    const calls: string[] = [];
    const root = defineService({
      name: 'example',
      async create({ onDispose }) {
        onDispose(() => {
          calls.push('first');
        });
        await acquired.promise;
        onDispose(async () => {
          calls.push('second');
          await cleanup.promise;
        });
        return { value: 1 };
      },
    });
    const scope = {};
    const start = root.init(scope);
    const failedStart = assert.rejects(start, /example: initialization was interrupted/);
    const stop = root.shutdown(scope);
    assert.equal(root.shutdown(scope), stop);
    let stopped = false;
    void stop.then(() => {
      stopped = true;
    });
    await assert.rejects(root.init(scope), isUnavailable);
    await assert.rejects(root.init({}), isUnavailable);
    await setImmediate();
    assert.equal(stopped, false);
    assert.deepEqual(calls, []);
    acquired.resolve();
    await setImmediate();
    assert.deepEqual(calls, ['second']);
    assert.equal(stopped, false);
    assert.throws(() => root.service.value, isUnavailable);
    cleanup.resolve();
    await failedStart;
    await stop;
    assert.deepEqual(calls, ['second', 'first']);
    assert.throws(() => root.service.value, isUnavailable);
  });

  it('rolls back partial startup in reverse order and preserves the original failure', async function () {
    const failure = new Error('subscription failed');
    const calls: string[] = [];
    let attempts = 0;
    const root = defineService({
      name: 'example',
      create({ onDispose }) {
        attempts += 1;
        onDispose(() => {
          calls.push('first');
        });
        onDispose(async () => {
          calls.push('second');
        });
        if (attempts === 1) {
          throw failure;
        }
        return { value: 1 };
      },
    });
    const scope = {};
    await assert.rejects(root.init(scope), (error) => error === failure);
    assert.deepEqual(calls, ['second', 'first']);
    await root.shutdown(scope);
    assert.deepEqual(calls, ['second', 'first']);
    const fresh = {};
    await root.init(fresh);
    assert.equal(root.service.value, 1);
    await root.shutdown(fresh);
    assert.deepEqual(calls, ['second', 'first', 'second', 'first']);
  });

  it('reports every rollback failure without replacing the startup error or permitting reuse', async function () {
    const failure = new Error('startup failed');
    const first = new Error('first cleanup failed');
    const second = new Error('second cleanup failed');
    const calls: string[] = [];
    const log = sandbox.stub(logging, 'error');
    const root = defineService({
      name: 'example',
      create({ onDispose }): { value: number } {
        onDispose(() => {
          calls.push('first');
          throw first;
        });
        onDispose(async () => {
          calls.push('second');
          throw second;
        });
        throw failure;
      },
    });
    const scope = {};
    await assert.rejects(root.init(scope), (error) => error === failure);
    assert.deepEqual(calls, ['second', 'first']);
    sinon.assert.calledOnce(log);
    const cleanupError = log.firstCall.args[0] as AggregateError;
    assert.ok(cleanupError instanceof AggregateError);
    assert.deepEqual(cleanupError.errors, [second, first]);
    await assert.rejects(root.shutdown(scope), (error) => error === cleanupError);
    await assert.rejects(root.init({}), /example: cleanup failed/);
    assert.deepEqual(calls, ['second', 'first']);
  });

  it('shares failed startup while rollback is pending and preserves it if logging fails', async function () {
    const cleanup = Promise.withResolvers<void>();
    const failure = new Error('startup failed');
    const cleanupFailure = new Error('cleanup failed');
    const log = sandbox.stub(logging, 'error').throws(new Error('logging failed'));
    const root = defineService({
      name: 'example',
      create({ onDispose }): { value: number } {
        onDispose(async () => {
          await cleanup.promise;
          throw cleanupFailure;
        });
        throw failure;
      },
    });
    const scope = {};
    const start = root.init(scope);
    assert.equal(root.init(scope), start);
    const failedStart = assert.rejects(start, (error) => error === failure);
    await setImmediate();
    assert.equal(root.init(scope), start);
    assert.throws(() => root.service.value, isUnavailable);
    cleanup.resolve();
    await failedStart;
    sinon.assert.calledOnce(log);
    await assert.rejects(root.shutdown(scope), (error) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [cleanupFailure]);
      return true;
    });
  });

  it('attempts every shutdown disposer once and retains a failed cleanup outcome', async function () {
    const failure = new Error('cleanup failed');
    const calls: string[] = [];
    const root = defineService({
      name: 'example',
      create({ onDispose }) {
        onDispose(() => {
          calls.push('first');
        });
        onDispose(() => {
          calls.push('second');
          throw failure;
        });
        return { value: 1 };
      },
    });
    const scope = {};
    await root.init(scope);
    const stop = root.shutdown(scope);
    assert.throws(() => root.service.value, isUnavailable);
    await assert.rejects(stop, (error) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [failure]);
      return true;
    });
    assert.equal(root.shutdown(scope), stop);
    await assert.rejects(root.init(scope), /example: cleanup failed/);
    await assert.rejects(root.init({}), /example: cleanup failed/);
    assert.deepEqual(calls, ['second', 'first']);
  });

  it('rejects synchronous recursive initialization without constructing twice', async function () {
    const scope = {};
    let calls = 0;
    const root: ServiceLifecycle<{ value: number }> = defineService({
      name: 'example',
      async create() {
        calls += 1;
        await root.init(scope);
        return { value: 1 };
      },
    });
    await assert.rejects(root.init(scope), /example: initialization called recursively/);
    assert.equal(calls, 1);
    assert.throws(() => root.service.value, isUnavailable);
    await root.shutdown(scope);
  });

  it('only accepts cleanup registration while creation is pending', async function () {
    let onDispose: (dispose: () => void) => void;
    const root = defineService({
      name: 'example',
      create(lifetime) {
        onDispose = lifetime.onDispose;
        return { value: 1 };
      },
    });
    const scope = {};
    await root.init(scope);
    assert.throws(() => onDispose(() => {}), /example: cleanup must be registered/);
    await root.shutdown(scope);
  });
});
