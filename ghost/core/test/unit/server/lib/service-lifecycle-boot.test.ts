import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { defineService } from '../../../../core/server/lib/service-lifecycle';
import { initializeService } from '../../../../core/server/lib/service-lifecycle/boot';

describe('Service boot initialization', function () {
  it('initializes a composition-only root without registering cleanup or requiring an owner', async function () {
    const instance = { value: 1 };
    const create = sinon.spy(() => instance);
    const root = defineService({ name: 'example', create });
    const owner = { registerCleanupTask: sinon.spy() };

    await initializeService(root, owner);
    await initializeService(root);

    sinon.assert.calledOnce(create);
    sinon.assert.notCalled(owner.registerCleanupTask);
    assert.equal(root.service.value, 1);
    assert.equal('shutdown' in root, false);
  });

  it('registers cleanup before starting resources and awaits startup before returning', async function () {
    const ready = Promise.withResolvers<void>();
    const tasks: Array<() => Promise<void>> = [];
    let started = false;
    let initialized = false;
    const stop = sinon.spy();
    const root = defineService({
      name: 'example',
      create: () => ({ value: 1 }),
      async start() {
        assert.equal(tasks.length, 1);
        started = true;
        await ready.promise;
      },
      shutdown: stop,
    });
    const startup = initializeService(root, {
      registerCleanupTask(task) {
        tasks.push(task);
      },
    }).then(() => {
      initialized = true;
    });

    try {
      await setImmediate();
      assert.equal(started, true);
      assert.equal(initialized, false);
    } finally {
      ready.resolve();
      await startup;
      await tasks[0]!();
    }
    sinon.assert.calledOnce(stop);
  });

  it('keeps an old owner cleanup idempotent after a resource root starts again', async function () {
    let generation = 0;
    const stopped: number[] = [];
    const root = defineService({
      name: 'example',
      create: () => {
        generation += 1;
        return { generation };
      },
      shutdown(instance) {
        stopped.push(instance.generation);
      },
    });
    const tasks: Array<() => Promise<void>> = [];
    const owner = {
      registerCleanupTask(task: () => Promise<void>) {
        tasks.push(task);
      },
    };
    await initializeService(root, owner);
    const firstStop = tasks[0]!();
    await firstStop;
    await initializeService(root, owner);
    await tasks[0]!();
    assert.equal(root.service.generation, 2);
    assert.deepEqual(stopped, [1]);
    assert.strictEqual(tasks[0]!(), firstStop);
    await tasks[1]!();
    assert.deepEqual(stopped, [1, 2]);
  });

  it('preserves the shutdown receiver and retains a failed cleanup result', async function () {
    const failure = new Error('Cleanup failed');
    let cleanup!: () => Promise<void>;
    const root = {
      service: {},
      init: async () => {},
      shutdown: sinon.spy(function (this: unknown): Promise<void> {
        assert.strictEqual(this, root);
        return Promise.reject(failure);
      }),
    };
    await initializeService(root, {
      registerCleanupTask(task) {
        cleanup = task;
      },
    });
    const stopped = cleanup();
    await assert.rejects(stopped, (error) => error === failure);
    assert.strictEqual(cleanup(), stopped);
    await assert.rejects(cleanup(), (error) => error === failure);
    sinon.assert.calledOnce(root.shutdown);
  });

  it('rejects a resource root without a cleanup owner before construction', async function () {
    const create = sinon.spy(() => ({}));
    const root = defineService({ name: 'example', create, shutdown() {} });

    await assert.rejects(initializeService(root), /requires a cleanup owner/);
    sinon.assert.notCalled(create);
  });
});
