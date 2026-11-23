import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import { defineService, type AnyServiceDefinition } from '@tryghost/kernel/define-service';
import type { EventKey, Foundation } from '@tryghost/kernel/foundation';
import { describe, expect, it, vi } from 'vitest';
import { createServices } from '../src/services.ts';

class Published {
  readonly post: string;
  constructor(post: string) {
    this.post = post;
  }
}

/** A foundation whose event bus keeps what is subscribed, so a test can dispatch to it. */
function fakeFoundation() {
  const handlers = new Map<EventKey, Set<(...payload: never[]) => unknown>>();
  const logged: unknown[] = [];
  const foundation = {
    logger: { error: (error: unknown) => logged.push(error) },
    events: {
      subscribe(event: EventKey, handler: (...payload: never[]) => unknown) {
        const subscribed = handlers.get(event) ?? new Set();
        handlers.set(event, subscribed);
        subscribed.add(handler);
        return () => {
          subscribed.delete(handler);
        };
      },
      dispatch(event: object) {
        for (const handler of handlers.get(event.constructor) ?? []) {
          (handler as (event: object) => unknown)(event);
        }
      },
    },
  } as unknown as Foundation;
  const listeners = (event: EventKey) => handlers.get(event)?.size ?? 0;
  return { foundation, listeners, logged };
}

function open(name = 'Test') {
  const fake = fakeFoundation();
  const services = createServices({ name, foundation: fake.foundation });
  services.open();
  return { services, ...fake };
}

describe('services of an application', function () {
  describe('building', function () {
    it('builds a service the first time it is used and keeps the instance', function () {
      const { services } = open();
      const create = vi.fn(() => ({}));
      const definition = defineService('Example', create);

      expect(create).not.toHaveBeenCalled();
      const first = services.get(definition);
      const second = services.get(definition);

      assert.equal(first, second);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('hands create the foundation and the instance of each need, building needs first', function () {
      const { services, foundation } = open();
      const order: string[] = [];
      const store = defineService('Store', () => {
        order.push('store');
        return { rows: 3 };
      });
      const report = defineService('Report', {
        needs: { store },
        create: (given) => {
          order.push('report');
          return { given };
        },
      });

      const { given } = services.get(report);

      assert.deepEqual(order, ['store', 'report']);
      assert.equal(given.foundation, foundation);
      assert.equal(given.store, services.get(store));
    });

    it('refuses to build before the application has opened its services', function () {
      const { foundation } = fakeFoundation();
      const services = createServices({ name: 'Ghost', foundation });
      const create = vi.fn(() => ({}));
      const definition = defineService('Example', create);

      assert.equal(services.isOpen, false);
      assert.throws(() => services.get(definition), {
        name: 'IncorrectUsageError',
        message:
          'Example was used while Ghost cannot build services. A service is built on first use, from the point in the start sequence where building is safe until the application stops.',
      });
      expect(create).not.toHaveBeenCalled();

      services.open();
      assert.equal(services.isOpen, true);
      assert.ok(services.get(definition));
    });

    it('reports a failed build to whoever used the service, keeps nothing and builds on the next use', function () {
      const { services } = open();
      const failure = new Error('Dependency unavailable');
      const create = vi
        .fn<() => { ready: boolean }>()
        .mockImplementationOnce(() => {
          throw failure;
        })
        .mockImplementation(() => ({ ready: true }));
      const definition = defineService('Example', create);

      assert.throws(() => services.get(definition), failure);

      assert.deepEqual(services.get(definition), { ready: true });
      expect(create).toHaveBeenCalledTimes(2);
    });

    it('does not keep a service whose need failed to build', function () {
      const { services } = open();
      const failure = new Error('Store unavailable');
      const store = defineService(
        'Store',
        vi
          .fn<() => object>()
          .mockImplementationOnce(() => {
            throw failure;
          })
          .mockImplementation(() => ({})),
      );
      const create = vi.fn(() => ({}));
      const report = defineService('Report', { needs: { store }, create });

      assert.throws(() => services.get(report), failure);
      expect(create).not.toHaveBeenCalled();

      assert.ok(services.get(report));
    });

    it('refuses a service that is built asynchronously', async function () {
      const { services } = open();
      const rejected = Promise.reject(new Error('Never awaited'));
      const definition = defineService(
        'Example',
        // The types refuse this too; a JavaScript root can still do it.
        (() => rejected) as unknown as () => object,
      );

      assert.throws(() => services.get(definition), {
        name: 'IncorrectUsageError',
        message:
          'Example is built asynchronously. A service is built synchronously: move what it waits for into its start.',
      });
      // The promise's own failure is not left unhandled.
      await assert.rejects(rejected);
    });

    it('refuses a service that needs itself, directly or through what it needs', function () {
      const { services } = open();
      const needs: Record<string, AnyServiceDefinition> = {};
      const first = defineService('First', { needs, create: () => ({}) });
      const second = defineService('Second', { needs: { first }, create: () => ({}) });
      needs.second = second;

      assert.throws(() => services.get(first), {
        name: 'IncorrectUsageError',
        message: 'First needs itself, directly or through what it needs.',
      });
      // The failed attempt left nothing half-built behind.
      assert.throws(() => services.get(second), /needs itself/);
    });
  });

  describe('listeners', function () {
    function counting() {
      const handled: string[] = [];
      const create = vi.fn(() => ({ handled }));
      const definition = defineService('Counter', {
        create,
        listeners: [
          {
            event: Published,
            handle: (service, event: Published) => service.handled.push(event.post),
          },
        ],
      });
      return { definition, create, handled };
    }

    it('delivers an event published before the service exists, building it then', function () {
      const { services, foundation } = open();
      const { definition, create, handled } = counting();

      services.register(definition);
      expect(create).not.toHaveBeenCalled();

      foundation.events.dispatch(new Published('first'));
      foundation.events.dispatch(new Published('second'));

      expect(create).toHaveBeenCalledTimes(1);
      assert.deepEqual(handled, ['first', 'second']);
      assert.equal(services.get(definition).handled, handled);
    });

    it('listens once however often a definition is registered', function () {
      const { services, foundation, listeners } = open();
      const { definition, handled } = counting();

      services.register(definition);
      services.register(definition);
      foundation.events.dispatch(new Published('only'));

      assert.equal(listeners(Published), 1);
      assert.deepEqual(handled, ['only']);
    });

    it('listens only while services can be built', async function () {
      const { foundation, listeners } = fakeFoundation();
      const services = createServices({ name: 'Test', foundation });
      const { definition, create, handled } = counting();

      // Registered before opening: nothing listens yet.
      services.register(definition);
      assert.equal(listeners(Published), 0);
      foundation.events.dispatch(new Published('before'));

      services.open();
      assert.equal(listeners(Published), 1);
      foundation.events.dispatch(new Published('during'));

      await services.close();
      assert.equal(listeners(Published), 0);
      foundation.events.dispatch(new Published('after'));

      assert.deepEqual(handled, ['during']);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('forgets what was registered on close, so the next start says what it listens for', async function () {
      const { foundation, listeners } = fakeFoundation();
      const services = createServices({ name: 'Test', foundation });
      const { definition } = counting();
      services.register(definition);
      services.open();

      await services.close();
      services.open();
      assert.equal(listeners(Published), 0);

      services.register(definition);
      assert.equal(listeners(Published), 1);
    });

    it('hands a failed build to the event bus, as a failing handler would be', function () {
      const { services, foundation } = open();
      const failure = new Error('Cannot be built');
      const definition = defineService('Example', {
        create: (): object => {
          throw failure;
        },
        listeners: [{ event: Published, handle: () => undefined }],
      });
      services.register(definition);

      assert.throws(() => foundation.events.dispatch(new Published('post')), failure);
    });

    it('refuses to build a definition with listeners that was never registered', function () {
      const { services } = open();
      const { definition, create } = counting();

      assert.throws(() => services.get(definition), {
        name: 'IncorrectUsageError',
        message:
          'Counter declares listeners or a start, but Test does not register it. Unregistered, its events are missed until its first use and its start never runs.',
      });
      expect(create).not.toHaveBeenCalled();

      services.register(definition);
      assert.ok(services.get(definition));
    });
  });

  describe('start and stop', function () {
    it('runs start only when the application starts the service, handing it the service and what create was given', async function () {
      const { services, foundation } = open();
      const start = vi.fn();
      const definition = defineService('Worker', { create: () => ({ id: 1 }), start });
      services.register(definition);

      const service = services.get(definition);
      expect(start).not.toHaveBeenCalled();

      await services.start(definition);
      await services.start(definition);

      expect(start).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledWith(service, { foundation });
    });

    it('registers what it starts', async function () {
      const { services, foundation } = open();
      const handled: string[] = [];
      const definition = defineService('Worker', {
        create: () => ({}),
        listeners: [
          { event: Published, handle: (_, event: Published) => handled.push(event.post) },
        ],
        start: () => undefined,
      });

      await services.start(definition);
      foundation.events.dispatch(new Published('post'));

      assert.deepEqual(handled, ['post']);
    });

    it('waits for an asynchronous start', async function () {
      const { services } = open();
      let finish!: () => void;
      const definition = defineService('Worker', {
        create: () => ({}),
        start: () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      });
      let started = false;

      const starting = services.start(definition).then(() => {
        started = true;
      });
      await Promise.resolve();
      assert.equal(started, false);
      // Built already, so its readers do not wait for the start.
      assert.ok(services.get(definition));

      finish();
      await starting;
      assert.equal(started, true);
    });

    it('stops a service whose start failed, rejects with the failure and can start it again', async function () {
      const { services } = open();
      const failure = new Error('Could not start');
      const start = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined);
      const stop = vi.fn();
      const definition = defineService('Worker', { create: () => ({}), start, stop });

      await assert.rejects(services.start(definition), failure);
      expect(stop).toHaveBeenCalledTimes(1);

      await services.start(definition);
      expect(start).toHaveBeenCalledTimes(2);
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('releases on close what start acquired, last started first, and only that', async function () {
      const { services } = open();
      const stopped: string[] = [];
      const worker = (name: string) =>
        defineService(name, {
          create: () => ({ name }),
          start: () => undefined,
          stop: (service) => stopped.push(service.name),
        });
      const first = worker('First');
      const second = worker('Second');
      const built = worker('Built, not started');

      await services.start(first);
      await services.start(second);
      services.register(built);
      services.get(built);
      await services.close();

      assert.deepEqual(stopped, ['Second', 'First']);
    });

    it('logs a failing stop and stops the rest', async function () {
      const { services, logged } = open();
      const failure = new Error('Could not stop');
      const stop = vi.fn();
      const first = defineService('First', { create: () => ({}), start: () => undefined, stop });
      const second = defineService('Second', {
        create: () => ({}),
        start: () => undefined,
        stop: () => {
          throw failure;
        },
      });

      await services.start(first);
      await services.start(second);
      await services.close();

      assert.deepEqual(logged, [failure]);
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('refuses to start a service while services cannot be built', async function () {
      const { foundation } = fakeFoundation();
      const services = createServices({ name: 'Test', foundation });
      const definition = defineService('Worker', { create: () => ({}), start: () => undefined });

      await assert.rejects(services.start(definition), IncorrectUsageError);
    });
  });

  describe('one application and another', function () {
    it('forgets every instance on close, so the next open builds its own', async function () {
      const { services } = open();
      const definition = defineService('Example', () => ({}));

      const first = services.get(definition);
      await services.close();
      assert.throws(() => services.get(definition), IncorrectUsageError);
      // Closing again, and opening twice, do nothing more.
      await services.close();
      services.open();
      services.open();

      assert.notEqual(services.get(definition), first);
    });

    it('gives two applications in one process their own instance of one definition', function () {
      const one = open('One');
      const two = open('Two');
      const handled: string[] = [];
      const definition = defineService('Example', {
        create: ({ foundation }) => ({ foundation }),
        listeners: [
          { event: Published, handle: (_, event: Published) => handled.push(event.post) },
        ],
      });
      one.services.register(definition);
      two.services.register(definition);

      const first = one.services.get(definition);
      const second = two.services.get(definition);

      assert.notEqual(first, second);
      assert.equal(first.foundation, one.foundation);
      assert.equal(second.foundation, two.foundation);

      // An event of one application is not seen by the other.
      one.foundation.events.dispatch(new Published('one'));
      assert.deepEqual(handled, ['one']);
    });
  });
});
