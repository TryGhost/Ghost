import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { defineProvider, on } from '../src/index.ts';
import type { Job, Listener } from '../src/index.ts';

const listener: Listener = () => {};
const job: Job = () => {};

describe('on', function () {
  it('lists a listener for an event named by a string, without loading its file', function () {
    let loaded = 0;
    const entry = on('post.published', () => {
      loaded += 1;
      return { default: listener };
    });

    assert.equal(entry.event, 'post.published');
    assert.equal(loaded, 0);
    assert.equal(entry.load().default, listener);
    assert.equal(loaded, 1);
  });

  it('lists a listener for an event named by its class', function () {
    class SomethingHappened {}

    assert.equal(on(SomethingHappened, () => ({ default: listener })).event, SomethingHappened);
  });

  it('gives an entry that cannot be changed', function () {
    assert.ok(Object.isFrozen(on('post.published', () => ({ default: listener }))));
  });
});

describe('defineProvider', function () {
  it('lists nothing for a provider that names nothing', function () {
    const provider = defineProvider({ name: 'empty' });

    assert.equal(provider.name, 'empty');
    assert.deepEqual(provider.listeners, []);
    assert.deepEqual(provider.jobs, []);
  });

  it('keeps listeners in the order they were listed', function () {
    const first = on('first', () => ({ default: listener }));
    const second = on('second', () => ({ default: listener }));

    assert.deepEqual(defineProvider({ name: 'ordered', listeners: [first, second] }).listeners, [
      first,
      second,
    ]);
  });

  it('lists jobs by name, with a schedule or without, and loads none', function () {
    let loaded = 0;
    const handle = () => {
      loaded += 1;
      return { default: job };
    };

    const provider = defineProvider({
      name: 'jobs',
      jobs: {
        'runs-daily': { cron: '0 0 3 * * *', handle },
        'runs-when-dispatched': { handle },
      },
    });

    assert.deepEqual(
      provider.jobs.map(({ name, cron }) => ({ name, cron })),
      [
        { name: 'runs-daily', cron: '0 0 3 * * *' },
        { name: 'runs-when-dispatched', cron: undefined },
      ],
    );
    assert.equal(loaded, 0);
    assert.equal(provider.jobs[0]?.load().default, job);
    assert.equal(loaded, 1);
  });

  it('gives a provider, and lists, that cannot be changed', function () {
    const listeners = [on('first', () => ({ default: listener }))];
    const provider = defineProvider({
      name: 'frozen',
      listeners,
      jobs: { 'a-job': { handle: () => ({ default: job }) } },
    });

    assert.ok(Object.isFrozen(provider));
    assert.ok(Object.isFrozen(provider.listeners));
    assert.ok(Object.isFrozen(provider.jobs));
    assert.ok(Object.isFrozen(provider.jobs[0]));
    // The list it was given is copied, so adding to that list later changes nothing.
    listeners.push(on('second', () => ({ default: listener })));
    assert.equal(provider.listeners.length, 1);
  });
});
