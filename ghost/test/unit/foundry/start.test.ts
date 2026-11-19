import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createApplication, type Steps } from '@tryghost/foundry/application';
import type { Logger } from '@tryghost/kernel/logging';

type Options = { frontend: boolean };
type State = { seen?: string };

function define(steps: Steps<any>, calls: string[] = [], errors: unknown[] = []) {
  const logger = { error: (error: unknown) => errors.push(error) } as unknown as Logger;
  return createApplication<{ get(): undefined }, Options, State>({
    name: 'Example',
    config: () => {
      calls.push('config');
      return { get: () => undefined };
    },
    logging: () => logger,
    database: () => undefined,
    events: () => ({ subscribe() {}, dispatch() {} }),
    steps,
  });
}

function slot(calls: string[], name: string, extra: object = {}) {
  return { name, run: () => void calls.push(name), ...extra };
}

function root(calls: string[], name: string) {
  return {
    name,
    load: () => {
      calls.push(`load ${name}`);
      return {
        init: async () => void calls.push(`init ${name}`),
        stop: async () => void calls.push(`stop ${name}`),
      };
    },
  };
}

describe('application.start', function () {
  it('runs the steps in the framework order, each with its slots around it', async function () {
    const calls: string[] = [];
    const application = define(
      {
        // Written out of order: the framework decides the order, not the definition.
        background: [slot(calls, 'background')],
        ready: { before: [slot(calls, 'before ready')], run: () => void calls.push('ready') },
        jobs: { run: () => void calls.push('jobs'), after: [slot(calls, 'after jobs')] },
        services: {
          before: [slot(calls, 'before services')],
          modules: [root(calls, 'posts')],
          after: [slot(calls, 'after services')],
        },
        shared: {
          before: [slot(calls, 'before shared')],
          modules: [root(calls, 'limits'), root(calls, 'settings')],
          after: [slot(calls, 'after shared')],
        },
        database: {
          before: [slot(calls, 'before database')],
          run: () => void calls.push('database'),
          after: [slot(calls, 'after database')],
        },
        foundation: { after: [slot(calls, 'after foundation')] },
      },
      calls,
    );

    const run = await application.start({ frontend: true });
    await run.background;

    assert.deepEqual(calls, [
      'config',
      'after foundation',
      'before database',
      'database',
      'after database',
      'before shared',
      'load limits',
      'init limits',
      'load settings',
      'init settings',
      'after shared',
      'before services',
      'load posts',
      'init posts',
      'after services',
      'jobs',
      'after jobs',
      'before ready',
      'ready',
      'background',
    ]);
    assert.deepEqual(application.built(), ['config', 'logging', 'database', 'events']);
  });

  it('waits for each entry before the next, and loads a module only when it is reached', async function () {
    const calls: string[] = [];
    let release = () => {};
    const application = define({
      shared: {
        before: [
          {
            name: 'slow',
            run: () =>
              new Promise<void>((resolve) => {
                release = resolve;
              }),
          },
        ],
        modules: [root(calls, 'limits')],
      },
    });

    const started = application.start({ frontend: true });
    await setImmediate();
    assert.deepEqual(calls, []);

    release();
    await started;
    assert.deepEqual(calls, ['load limits', 'init limits']);
  });

  it('runs a slot listed between two modules in its place, and stops it in reverse order', async function () {
    const calls: string[] = [];
    const application = define({
      services: {
        modules: [
          root(calls, 'members'),
          slot(calls, 'legacy', { stop: () => void calls.push('stop legacy') }),
          root(calls, 'tiers'),
        ],
      },
    });

    await application.start({ frontend: true });
    await application.stop();

    assert.deepEqual(calls, [
      'load members',
      'init members',
      'legacy',
      'load tiers',
      'init tiers',
      'stop tiers',
      'stop legacy',
      'stop members',
    ]);
  });

  it('hands every entry the same run: options, foundation and shared state', async function () {
    const state: State = {};
    const application = define({
      foundation: {
        after: [
          {
            name: 'writes',
            run: (run) => {
              run.state.seen = `frontend ${run.options.frontend}`;
            },
          },
        ],
      },
      ready: { run: (run) => assert.equal(run.foundation, application.foundation) },
    });

    const run = await application.start({ frontend: false }, state);

    assert.equal(run.state, state);
    assert.equal(state.seen, 'frontend false');
  });

  it('skips a slot or a module whose `when` says no, without loading the module', async function () {
    const calls: string[] = [];
    const frontend = (run: { options: Options }) => run.options.frontend;
    const application = define({
      services: {
        before: [slot(calls, 'helpers', { when: frontend }), slot(calls, 'apps')],
        modules: [{ ...root(calls, 'themes'), when: frontend }, root(calls, 'posts')],
      },
    });

    await application.start({ frontend: false });

    assert.deepEqual(calls, ['apps', 'load posts', 'init posts']);
  });

  it('rejects with the error of the step that failed, and runs nothing after it', async function () {
    const calls: string[] = [];
    const failure = new TypeError('settings failed');
    const application = define({
      shared: {
        modules: [
          root(calls, 'limits'),
          { name: 'settings', load: () => ({ init: () => Promise.reject(failure) }) },
          root(calls, 'keys'),
        ],
        after: [slot(calls, 'after shared')],
      },
      ready: { run: () => void calls.push('ready') },
      background: [slot(calls, 'background')],
    });

    await assert.rejects(application.start({ frontend: true }), (error) => error === failure);
    assert.deepEqual(calls, ['load limits', 'init limits']);
  });

  it('does not wait for background work, and one failure does not stop the rest', async function () {
    const calls: string[] = [];
    const errors: unknown[] = [];
    const failure = new TypeError('recovery failed');
    let release = () => {};
    const application = define(
      {
        ready: { run: () => void calls.push('ready') },
        background: [
          {
            name: 'slow',
            run: () =>
              new Promise<void>((resolve) => {
                calls.push('slow began');
                release = resolve;
              }),
          },
          {
            name: 'fails',
            run: () => {
              throw failure;
            },
          },
          { name: 'rejects', run: () => Promise.reject(failure) },
          slot(calls, 'last'),
        ],
      },
      [],
      errors,
    );

    const run = await application.start({ frontend: true });
    // The first entry has begun by the time start() resolves; nothing waited for it.
    assert.deepEqual(calls, ['ready', 'slow began']);

    release();
    await run.background;
    assert.deepEqual(calls, ['ready', 'slow began', 'last']);
    assert.deepEqual(errors, [failure, failure]);
  });
});

describe('application.stop', function () {
  it('stops what started, in reverse order, and carries on past a failure', async function () {
    const calls: string[] = [];
    const errors: unknown[] = [];
    const failure = new TypeError('stop failed');
    const application = define(
      {
        foundation: {
          after: [slot(calls, 'server', { stop: () => void calls.push('stop server') })],
        },
        shared: { modules: [root(calls, 'limits')] },
        services: {
          modules: [
            {
              name: 'broken',
              load: () => ({ init: async () => {}, stop: () => Promise.reject(failure) }),
            },
            // A root with nothing to stop.
            { name: 'plain', load: () => ({ init: async () => {} }) },
            root(calls, 'posts'),
          ],
        },
        background: [slot(calls, 'poller', { stop: () => void calls.push('stop poller') })],
      },
      [],
      errors,
    );
    const run = await application.start({ frontend: true });
    await run.background;
    calls.length = 0;

    await application.stop();

    assert.deepEqual(calls, ['stop poller', 'stop posts', 'stop limits', 'stop server']);
    assert.deepEqual(errors, [failure]);

    await application.stop();
    assert.equal(calls.length, 4);
  });

  it('stops what had started when a later step failed', async function () {
    const calls: string[] = [];
    const application = define({
      shared: { modules: [root(calls, 'limits')] },
      services: {
        modules: [
          { name: 'broken', load: () => ({ init: () => Promise.reject(new TypeError('no')) }) },
          root(calls, 'posts'),
        ],
      },
    });
    await assert.rejects(application.start({ frontend: true }), TypeError);
    calls.length = 0;

    await application.stop();

    assert.deepEqual(calls, ['stop limits']);
  });

  it('can start again after a stop, with a new run and the same foundation', async function () {
    const calls: string[] = [];
    const application = define({ shared: { modules: [root(calls, 'limits')] } }, calls);

    const first = await application.start({ frontend: true });
    await application.stop();
    const second = await application.start({ frontend: false });
    await application.stop();

    assert.notEqual(first, second);
    assert.notEqual(first.state, second.state);
    assert.equal(first.foundation, second.foundation);
    assert.deepEqual(calls, [
      'config',
      'load limits',
      'init limits',
      'stop limits',
      'load limits',
      'init limits',
      'stop limits',
    ]);
  });
  it('stops what an earlier start left running before it starts again', async function () {
    const calls: string[] = [];
    const application = define({ shared: { modules: [root(calls, 'limits')] } }, calls);

    await application.start({ frontend: true });
    await application.start({ frontend: true });

    assert.deepEqual(calls, [
      'config',
      'load limits',
      'init limits',
      'stop limits',
      'load limits',
      'init limits',
    ]);
  });
});

describe('application.start: what a shared module is given', function () {
  function shared(name: string, given: Record<string, unknown>, needs?: string[]) {
    return {
      name,
      needs,
      load: () => ({
        init: async (dependencies: unknown) => void (given[name] = dependencies),
        service: `${name} instance`,
      }),
    };
  }

  it('hands each shared module the foundation and the earlier modules it names', async function () {
    const given: Record<string, any> = {};
    const application = define({
      shared: {
        modules: [shared('limits', given), shared('settings', given, ['limits'])],
      },
    });

    await application.start({ frontend: true });

    assert.deepEqual(Object.keys(given.limits), ['foundation']);
    assert.equal(given.limits.foundation, application.foundation);
    assert.deepEqual(Object.keys(given.settings), ['foundation', 'limits']);
    assert.equal(given.settings.limits, 'limits instance');
  });

  it('fails the start when a module names one that has not started before it', async function () {
    const given: Record<string, unknown> = {};
    const application = define({
      shared: {
        modules: [shared('settings', given, ['limits']), shared('limits', given)],
      },
    });

    await assert.rejects(application.start({ frontend: true }), /settings needs limits/);
    assert.deepEqual(given, {});
  });

  it('hands nothing to a root in the services step', async function () {
    const given: Record<string, unknown> = {};
    const application = define({ services: { modules: [shared('posts', given)] } });

    await application.start({ frontend: true });

    assert.equal(given.posts, undefined);
  });
});
