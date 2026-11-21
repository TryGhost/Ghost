import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import logging from '@tryghost/logging';
import sinon from 'sinon';
import { afterEach, describe, it, vi } from 'vitest';
import DomainEvents, { DomainEvents as namedDomainEvents } from '../src/index.ts';
import type { IEvent } from '../src/index.ts';

const require = createRequire(import.meta.url);

class TestEvent implements IEvent<{ message: string }> {
  timestamp: Date;
  data: { message: string };

  constructor(message: string) {
    this.timestamp = new Date();
    this.data = {
      message,
    };
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe('DomainEvents', function () {
  afterEach(function () {
    sinon.restore();
    DomainEvents.ee.removeAllListeners();
    DomainEvents.resetTrackingStateForTest();
    DomainEvents.setTrackingEnabledForTest(process.env.NODE_ENV?.startsWith('test') ?? false);
  });

  it('Will call multiple subscribers with the event when it is dispatched', async function () {
    const event = new TestEvent('Hello, world!');

    const events: TestEvent[] = [];

    function handler1(receivedEvent: TestEvent) {
      // Do not add assertions here, they are caught by DomainEvents
      events.push(receivedEvent);
    }

    function handler2(receivedEvent: TestEvent) {
      // Do not add assertions here, they are caught by DomainEvents
      events.push(receivedEvent);
    }

    DomainEvents.subscribe(TestEvent, handler1);
    DomainEvents.subscribe(TestEvent, handler2);

    DomainEvents.dispatch(event);
    await DomainEvents.allSettled();

    assert.equal(events.length, 2);
    assert.equal(events[0], event);
    assert.equal(events[1], event);
  });

  it('Catches async errors in handlers', async function () {
    const event = new TestEvent('Hello, world!');

    const stub = sinon.stub(logging, 'error').returns();

    async function handler1() {
      await sleep(10);
      throw new Error('Test error');
    }

    DomainEvents.subscribe(TestEvent, handler1);

    DomainEvents.dispatch(event);
    await DomainEvents.allSettled();
    assert.equal(stub.calledTwice, true);
  });

  it('works when tracking is disabled', async function () {
    let handled = false;

    DomainEvents.setTrackingEnabledForTest(false);

    DomainEvents.subscribe(TestEvent, () => {
      handled = true;
    });

    DomainEvents.dispatch(new TestEvent('No tracking'));
    // Yield once so the async-wrapped handler can run before allSettled()
    // resolves immediately with tracking disabled.
    await sleep(0);
    await DomainEvents.allSettled();

    assert.equal(handled, true);
  });

  describe('allSettled', function () {
    it('Resolves when there are no events', async function () {
      await DomainEvents.allSettled();
      assert(true);
    });

    it('Waits for all listeners', async function () {
      let counter = 0;
      DomainEvents.subscribe(TestEvent, async () => {
        await sleep(20);
        counter += 1;
      });
      DomainEvents.subscribe(TestEvent, async () => {
        await sleep(40);
        counter += 1;
      });

      DomainEvents.dispatch(new TestEvent('Hello, world!'));
      await DomainEvents.allSettled();
      assert.equal(counter, 2);
    });

    it('waits for every tracked listener before resolving', async function () {
      const resolvers: Array<() => void> = [];
      const pending = () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });

      DomainEvents.subscribe(TestEvent, pending);
      DomainEvents.subscribe(TestEvent, pending);

      DomainEvents.dispatch(new TestEvent('Hello, world!'));

      let settled = false;
      const allSettled = DomainEvents.allSettled().then(() => {
        settled = true;
      });

      await sleep(0);
      assert.equal(settled, false);

      const [resolveFirst, resolveSecond] = resolvers;
      assert.ok(resolveFirst);
      assert.ok(resolveSecond);

      resolveFirst();
      await sleep(0);
      assert.equal(settled, false);

      resolveSecond();
      await allSettled;
      assert.equal(settled, true);
    });
  });

  describe('module contract', function () {
    it('exports the event bus as the default and as a named export', function () {
      assert.equal(namedDomainEvents, DomainEvents);
      assert.equal(typeof DomainEvents.subscribe, 'function');
      assert.equal(typeof DomainEvents.dispatch, 'function');
    });

    it('gives CommonJS consumers the event bus itself from the compiled package', function () {
      const compiledDomainEvents: unknown = require('@tryghost/domain-events');

      assert.equal(compiledDomainEvents, DomainEvents);
    });

    it('hands out the same event bus when the module is loaded again', async function () {
      vi.resetModules();
      const reloaded = await import('../src/index.ts');

      assert.equal(reloaded.default, DomainEvents);
    });
  });
});
