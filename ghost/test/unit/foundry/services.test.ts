import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { expectTypeOf } from 'vitest';
import { createApplication, type Steps } from '@tryghost/foundry/application';
import { createServices } from '@tryghost/foundry/services';
import { defineService } from '@tryghost/kernel/define-service';
import type { Foundation } from '@tryghost/kernel/foundation';

class PostPublished {
  readonly title: string;

  constructor(title: string) {
    this.title = title;
  }
}

// An event bus with no memory of what was published before a listener existed.
function fakeFoundation() {
  const handlers = new Map<string, ((event: unknown) => unknown)[]>();
  const errors: unknown[] = [];
  const foundation = {
    config: { get: () => undefined },
    logging: { error: (error: unknown) => errors.push(error) },
    database: undefined,
    clock: { now: () => 0 },
    events: {
      subscribe(event: { name: string }, handler: (event: unknown) => unknown) {
        handlers.set(event.name, [...(handlers.get(event.name) ?? []), handler]);
      },
      dispatch(event: object) {
        return (handlers.get(event.constructor.name) ?? []).map((handler) => handler(event));
      },
    },
  };
  return {
    foundation: foundation as unknown as Foundation,
    errors,
    publish: (event: object) => foundation.events.dispatch(event),
    listeners: (event: { name: string }) => handlers.get(event.name)?.length ?? 0,
  };
}

function site(name = 'Example') {
  const fake = fakeFoundation();
  return { ...fake, services: createServices({ name, foundation: fake.foundation }) };
}

describe('defineService, given a definition', function () {
  it('returns the definition and builds nothing', function () {
    let created = 0;
    const written = { name: 'Example', create: () => ({ created: (created += 1) }) };
    const example = defineService(written);

    assert.equal(example, written);
    assert.equal(created, 0);
    assert.deepEqual(Object.keys(example), ['name', 'create']);
  });

  it('types what create is handed from what the definition needs', function () {
    const clock = defineService({ name: 'Clock', create: () => ({ zone: 'UTC' }) });
    const held = { service: { limit: 5 }, init: async () => {} };
    defineService({
      name: 'Example',
      needs: { clock, held },
      create: (given) => {
        expectTypeOf(given.clock).toEqualTypeOf<{ zone: string }>();
        expectTypeOf(given.held).toEqualTypeOf<{ limit: number }>();
        expectTypeOf(given.foundation).toEqualTypeOf<Foundation>();
        return {};
      },
    });
  });
});

describe('The services of an application', function () {
  describe('building', function () {
    it('builds a service the first time it is used and keeps the instance', function () {
      const { services } = site();
      let created = 0;
      const example = defineService({ name: 'Example', create: () => ({ id: (created += 1) }) });
      services.open();

      assert.equal(created, 0);
      const first = services.get(example);
      assert.equal(services.get(example), first);
      assert.equal(created, 1);
    });

    it('hands create the foundation and the instance of each thing it needs', function () {
      const { services, foundation } = site();
      const order: string[] = [];
      const attribution = defineService({
        name: 'Attribution',
        create: () => {
          order.push('attribution');
          return { source: 'direct' };
        },
      });
      // A root that still holds its instance and was started by boot.
      const newsletters = { service: { count: 2 }, init: async () => {} };
      const staff = defineService({
        name: 'Staff',
        needs: { attribution, newsletters },
        create: (given) => {
          order.push('staff');
          return given;
        },
      });
      services.open();

      const given = services.get(staff);

      assert.deepEqual(order, ['attribution', 'staff']);
      assert.equal(given.foundation, foundation);
      assert.equal(given.attribution, services.get(attribution));
      assert.equal(given.newsletters, newsletters.service);
    });

    it('refuses to build before the application has opened its services', function () {
      const { services } = site('Ghost');
      let created = 0;
      const example = defineService({ name: 'Example', create: () => (created += 1) });

      assert.throws(() => services.get(example), {
        name: 'IncorrectUsageError',
        message: /^Example was used while Ghost is not started\./,
      });
      assert.equal(created, 0);

      services.open();
      assert.equal(services.get(example), 1);
    });

    it('reports a failed build to whoever used the service, and builds again on the next use', function () {
      const { services } = site();
      const failure = new Error('no database');
      let attempts = 0;
      const example = defineService({
        name: 'Example',
        create: () => {
          attempts += 1;
          if (attempts === 1) {
            throw failure;
          }
          return { attempts };
        },
      });
      services.open();

      assert.throws(
        () => services.get(example),
        (error) => error === failure,
      );
      assert.deepEqual(services.get(example), { attempts: 2 });
    });

    it('refuses a definition that needs itself', function () {
      const { services } = site();
      const needs: Record<string, any> = {};
      const first = defineService({ name: 'First', needs, create: () => ({}) });
      const second = defineService({ name: 'Second', needs: { first }, create: () => ({}) });
      needs.second = second;
      services.open();

      assert.throws(() => services.get(first), {
        name: 'IncorrectUsageError',
        message: 'First needs itself, directly or through what it needs.',
      });
    });
  });

  describe('a service that is built asynchronously', function () {
    it('is awaited by resolve(), once, and read by get() afterwards', async function () {
      const { services } = site();
      const ready = Promise.withResolvers<{ ready: true }>();
      let created = 0;
      const auth = defineService({
        name: 'Auth',
        create: () => {
          created += 1;
          return ready.promise;
        },
      });
      services.open();

      const first = services.resolve(auth);
      const second = services.resolve(auth);
      assert.throws(() => services.get(auth), {
        name: 'IncorrectUsageError',
        message:
          'Auth is built asynchronously and is not ready. Await resolve(), or have the start sequence build it.',
      });
      ready.resolve({ ready: true });

      assert.equal(await first, await second);
      assert.equal(services.get(auth), await first);
      assert.equal(created, 1);
    });

    it('makes whatever needs it asynchronous too', async function () {
      const { services } = site();
      const auth = defineService({ name: 'Auth', create: async () => ({ user: 'owner' }) });
      const sessions = defineService({
        name: 'Sessions',
        needs: { auth },
        create: ({ auth: built }) => ({ user: built.user }),
      });
      services.open();

      assert.throws(() => services.get(sessions), /Sessions is built asynchronously/);
      assert.deepEqual(await services.resolve(sessions), { user: 'owner' });
      assert.deepEqual(services.get(sessions), { user: 'owner' });
    });

    it('rejects with a failed build and builds again on the next use', async function () {
      const { services } = site();
      const failure = new Error('no secret');
      let attempts = 0;
      const auth = defineService({
        name: 'Auth',
        create: async () => {
          attempts += 1;
          if (attempts === 1) {
            throw failure;
          }
          return { attempts };
        },
      });
      services.open();

      await assert.rejects(services.resolve(auth), (error) => error === failure);
      assert.deepEqual(await services.resolve(auth), { attempts: 2 });
    });
  });

  describe('declared listeners', function () {
    function counting() {
      const seen: string[] = [];
      let created = 0;
      const mentions = defineService({
        name: 'Mentions',
        create: () => ({ id: (created += 1) }),
        listeners: [
          {
            event: PostPublished,
            handle: (service, event: PostPublished) =>
              void seen.push(`${event.title} to ${service.id}`),
          },
        ],
      });
      return { mentions, seen, created: () => created };
    }

    it('deliver an event published before the service exists, building it then', function () {
      const { services, publish } = site();
      const { mentions, seen, created } = counting();
      services.register(mentions);
      services.open();
      assert.equal(created(), 0);

      publish(new PostPublished('First'));

      assert.deepEqual(seen, ['First to 1']);
      assert.equal(services.get(mentions).id, 1);
    });

    it('are attached once however often the definition is registered', function () {
      const { services, publish, listeners } = site();
      const { mentions, seen } = counting();
      services.register(mentions);
      services.register(mentions);
      services.open();

      publish(new PostPublished('First'));

      assert.equal(listeners(PostPublished), 1);
      assert.deepEqual(seen, ['First to 1']);
    });

    it('wait for a service that is built asynchronously', async function () {
      const { services, publish } = site();
      const seen: string[] = [];
      const mentions = defineService({
        name: 'Mentions',
        create: async () => ({ id: 1 }),
        listeners: [
          {
            event: PostPublished,
            handle: (_service, event: PostPublished) => seen.push(event.title),
          },
        ],
      });
      services.register(mentions);
      services.open();

      await Promise.all(publish(new PostPublished('First')));

      assert.deepEqual(seen, ['First']);
    });

    it('hand a failed build to the event bus, and deliver the next event', function () {
      const { services, publish } = site();
      const failure = new Error('no database');
      const seen: string[] = [];
      let attempts = 0;
      const mentions = defineService({
        name: 'Mentions',
        create: () => {
          attempts += 1;
          if (attempts === 1) {
            throw failure;
          }
          return {};
        },
        listeners: [
          {
            event: PostPublished,
            handle: (_service, event: PostPublished) => seen.push(event.title),
          },
        ],
      });
      services.register(mentions);
      services.open();

      assert.throws(
        () => publish(new PostPublished('First')),
        (error) => error === failure,
      );
      publish(new PostPublished('Second'));

      assert.deepEqual(seen, ['Second']);
    });

    it('deliver nothing while the application is not started', async function () {
      const { services, publish } = site();
      const { mentions, seen, created } = counting();
      services.register(mentions);

      publish(new PostPublished('Before'));
      services.open();
      await services.close();
      publish(new PostPublished('After'));

      assert.deepEqual(seen, []);
      assert.equal(created(), 0);
    });

    // Otherwise the events published before its first use would be lost without a sign.
    it('refuse to build a definition with listeners that was never registered', function () {
      const { services } = site('Ghost');
      const { mentions, created } = counting();
      services.open();

      assert.throws(() => services.get(mentions), {
        name: 'IncorrectUsageError',
        message: /^Mentions declares listeners or a start, but Ghost does not register it\./,
      });
      assert.equal(created(), 0);
    });
  });

  describe('start and stop', function () {
    function pinging(calls: string[]) {
      return defineService({
        name: 'Ping',
        create: () => ({ timer: false }),
        start: (service, { foundation }) => {
          service.timer = true;
          calls.push(`start with ${typeof foundation.clock.now()}`);
        },
        stop: (service) => {
          service.timer = false;
          calls.push('stop');
        },
      });
    }

    it('does not start a service that is only used', function () {
      const { services } = site();
      const calls: string[] = [];
      const ping = pinging(calls);
      services.register(ping);
      services.open();

      assert.equal(services.get(ping).timer, false);
      assert.deepEqual(calls, []);
    });

    it('releases on close what start acquired, and only that', async function () {
      const { services } = site();
      const calls: string[] = [];
      const ping = pinging(calls);
      const idle = defineService({
        name: 'Idle',
        create: () => ({}),
        stop: () => void calls.push('stop idle'),
      });
      services.register(ping);
      services.open();
      services.get(idle);

      await services.start(ping);
      const started = services.get(ping);
      assert.equal(started.timer, true);
      await services.start(ping);
      await services.close();

      assert.deepEqual(calls, ['start with number', 'stop']);
      assert.equal(started.timer, false);
    });

    it('stops a service whose start failed, and rejects with the failure', async function () {
      const { services } = site();
      const failure = new Error('port in use');
      const calls: string[] = [];
      const ping = defineService({
        name: 'Ping',
        create: () => ({}),
        start: () => {
          calls.push('start');
          throw failure;
        },
        stop: () => void calls.push('stop'),
      });
      services.register(ping);
      services.open();

      await assert.rejects(services.start(ping), (error) => error === failure);
      await services.close();

      assert.deepEqual(calls, ['start', 'stop']);
    });

    it('logs a failing stop and still stops the rest', async function () {
      const { services, errors } = site();
      const failure = new Error('already closed');
      const calls: string[] = [];
      const first = pinging(calls);
      const second = defineService({
        name: 'Second',
        create: () => ({}),
        start: () => {},
        stop: () => {
          throw failure;
        },
      });
      services.register(first);
      services.register(second);
      services.open();
      await services.start(first);
      await services.start(second);

      await services.close();

      assert.deepEqual(errors, [failure]);
      assert.deepEqual(calls, ['start with number', 'stop']);
    });

    it('refuses to build a definition with a start that was never registered', function () {
      const { services } = site();
      services.open();

      assert.throws(() => services.get(pinging([])), /declares listeners or a start/);
    });
  });

  describe('across starts and applications', function () {
    it('forgets every instance on close, so the next start builds its own', async function () {
      const { services } = site();
      const stubbed = { mailer: 'stub from the first test' };
      let mailer = stubbed.mailer;
      const staff = defineService({ name: 'Staff', create: () => ({ mailer }) });

      services.open();
      const first = services.get(staff);
      await services.close();
      assert.throws(() => services.get(staff), /was used while Example is not started/);

      // What the first test stubbed is gone; the second start must not see it.
      mailer = 'real';
      services.open();
      const second = services.get(staff);

      assert.notEqual(second, first);
      assert.equal(first.mailer, 'stub from the first test');
      assert.equal(second.mailer, 'real');
    });

    it('gives two applications in one process their own instance of one definition', function () {
      const first = site('first.example');
      const second = site('second.example');
      const seen: string[] = [];
      const posts = defineService({
        name: 'Posts',
        create: ({ foundation }) => ({ foundation, published: [] as string[] }),
        listeners: [
          {
            event: PostPublished,
            handle: (service, event: PostPublished) => {
              service.published.push(event.title);
              seen.push(event.title);
            },
          },
        ],
      });
      for (const { services } of [first, second]) {
        services.register(posts);
        services.open();
      }

      first.publish(new PostPublished('Only on the first site'));

      assert.notEqual(first.services.get(posts), second.services.get(posts));
      assert.equal(first.services.get(posts).foundation, first.foundation);
      assert.equal(second.services.get(posts).foundation, second.foundation);
      assert.deepEqual(first.services.get(posts).published, ['Only on the first site']);
      assert.deepEqual(second.services.get(posts).published, []);
      assert.deepEqual(seen, ['Only on the first site']);
    });
  });
});

describe('application.start, with service definitions', function () {
  type Options = { worker: boolean };
  function define(steps: Steps<{ options: Options }>, calls: string[]) {
    const fake = fakeFoundation();
    const application = createApplication<{ get(): undefined }, Options>({
      name: 'Example',
      config: () => ({ get: () => undefined }),
      logging: () => fake.foundation.logging,
      database: () => undefined,
      events: () => fake.foundation.events,
      steps: steps as never,
    });
    return { application, calls, publish: fake.publish };
  }

  function definitions(calls: string[]) {
    const lazy = defineService({
      name: 'Lazy',
      create: () => {
        calls.push('create lazy');
        return {};
      },
    });
    const listening = defineService({
      name: 'Listening',
      create: () => {
        calls.push('create listening');
        return {};
      },
      listeners: [{ event: PostPublished, handle: () => void calls.push('handle') }],
    });
    const pinging = defineService({
      name: 'Pinging',
      create: () => {
        calls.push('create pinging');
        return {};
      },
      start: () => void calls.push('start pinging'),
      stop: () => void calls.push('stop pinging'),
    });
    return { lazy, listening, pinging };
  }

  it('builds nothing that is only declared, and starts what the list names', async function () {
    const calls: string[] = [];
    const { lazy, listening, pinging } = definitions(calls);
    const { application, publish } = define(
      {
        services: {
          declared: [{ name: 'listening', load: () => listening }],
          modules: [
            {
              name: 'legacy',
              load: () => ({ init: async () => void calls.push('init legacy') }),
            },
            { name: 'pinging', load: () => pinging },
          ],
        },
        ready: { run: () => void calls.push('ready') },
      },
      calls,
    );

    await application.start({ worker: true });
    assert.deepEqual(calls, ['init legacy', 'create pinging', 'start pinging', 'ready']);

    publish(new PostPublished('First'));
    application.services.get(lazy);
    assert.deepEqual(calls.slice(4), ['create listening', 'handle', 'create lazy']);

    await application.stop();
    assert.deepEqual(calls.slice(7), ['stop pinging']);
  });

  it('lets a role decide which starts run, through the entry’s when', async function () {
    const calls: string[] = [];
    const { pinging } = definitions(calls);
    const { application } = define(
      {
        services: {
          modules: [
            { name: 'pinging', when: ({ options }) => options.worker, load: () => pinging },
          ],
        },
      },
      calls,
    );

    await application.start({ worker: false });
    assert.deepEqual(calls, []);

    await application.start({ worker: true });
    assert.deepEqual(calls, ['create pinging', 'start pinging']);
  });

  it('refuses a service used before the services step, and allows it from there on', async function () {
    const calls: string[] = [];
    const { lazy } = definitions(calls);
    const read = () => void application.services.get(lazy);
    let early: unknown;
    const { application } = define(
      {
        shared: {
          modules: [
            {
              name: 'settings',
              load: () => ({
                init: async () => {
                  try {
                    read();
                  } catch (error) {
                    early = error;
                  }
                },
              }),
            },
          ],
        },
        services: { before: [{ name: 'reads', run: read }], modules: [] },
      },
      calls,
    );

    assert.throws(read, /Lazy was used while Example is not started/);
    await application.start({ worker: true });

    assert.match(String(early), /Lazy was used while Example is not started/);
    assert.deepEqual(calls, ['create lazy']);
  });

  it('gives each start its own instances, as a process that starts twice needs', async function () {
    const calls: string[] = [];
    const { lazy, pinging } = definitions(calls);
    const { application } = define(
      { services: { modules: [{ name: 'pinging', load: () => pinging }] } },
      calls,
    );

    await application.start({ worker: true });
    const first = application.services.get(lazy);
    // No stop in between: the second start stops the first, as tests rely on.
    await application.start({ worker: true });
    const second = application.services.get(lazy);
    await setImmediate();

    assert.notEqual(first, second);
    assert.deepEqual(calls, [
      'create pinging',
      'start pinging',
      'create lazy',
      'stop pinging',
      'create pinging',
      'start pinging',
      'create lazy',
    ]);
  });
});
