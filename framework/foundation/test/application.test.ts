import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { createApplication } from '../src/index.ts';
import { defineProvider, on } from '#support/define-provider';
import type { Job, Listener, ListenerEntry } from '#support/define-provider';
import type { Events, Jobs, Site } from '#support/site';

function createSite(name = 'a') {
  const events = new EventEmitter();
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const site: Site = {
    id: name,
    config: { get: (key) => `${name}:${key}` },
    log,
    // A string-named bus. Class-named events are covered with a bus of their own below.
    events: events as unknown as Events,
  };
  return { site, events, log };
}

// Stands in for `() => require('./file')`, and counts how often the file is asked for.
function file(listener: Listener) {
  return vi.fn(() => ({ default: listener }));
}

function listening(site: Site, listeners: Record<string, ReturnType<typeof file>>) {
  return createApplication({
    providers: [defineProvider({ name: 'example', listeners: entries(listeners) })],
  }).listen(site);
}

function entries(listeners: Record<string, ReturnType<typeof file>>): ListenerEntry[] {
  return Object.entries(listeners).map(([event, load]) => on(event, load));
}

describe('createApplication', () => {
  it('loads nothing when it is created or when it starts listening', () => {
    const load = file(() => {});
    const { site, events } = createSite();

    listening(site, { published: load });

    expect(load).not.toHaveBeenCalled();
    expect(events.listenerCount('published')).toBe(1);
  });

  it('loads a listener when its first event arrives, and hands it the site and the event', () => {
    const listener = vi.fn();
    const load = file(listener);
    const { site, events } = createSite();
    listening(site, { published: load });

    events.emit('published', 'post-1', { importing: false });

    expect(load).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledExactlyOnceWith(site, 'post-1', { importing: false });
  });

  it('calls every listener listed for an event, across providers, in the order listed', () => {
    const calls: string[] = [];
    const { site, events } = createSite();
    const first = defineProvider({
      name: 'first',
      listeners: [
        on(
          'published',
          file(() => calls.push('first-a')),
        ),
        on(
          'published',
          file(() => calls.push('first-b')),
        ),
        on(
          'edited',
          file(() => calls.push('first-edited')),
        ),
      ],
    });
    const second = defineProvider({
      name: 'second',
      listeners: [
        on(
          'published',
          file(() => calls.push('second')),
        ),
      ],
    });
    createApplication({ providers: [first, second] }).listen(site);

    events.emit('published');

    expect(calls).toEqual(['first-a', 'first-b', 'second']);
  });

  it('keeps two sites apart: each listener is handed the site its event came from', () => {
    const seen: unknown[] = [];
    const provider = defineProvider({
      name: 'example',
      listeners: [
        on(
          'published',
          file((site) => seen.push(site.id)),
        ),
      ],
    });
    const application = createApplication({ providers: [provider] });
    const a = createSite('a');
    const b = createSite('b');
    application.listen(a.site);
    application.listen(b.site);

    b.events.emit('published');

    expect(seen).toEqual(['b']);
  });

  it('lets a listener that throws reach the emitter, as any listener does', () => {
    const { site, events, log } = createSite();
    const failure = new Error('listener failed');
    listening(site, {
      published: file(() => {
        throw failure;
      }),
    });

    expect(() => events.emit('published')).toThrow(failure);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('logs a listener whose promise rejects, which the emitter cannot see', async () => {
    const { site, events, log } = createSite();
    const failure = new Error('delivery failed');
    listening(site, { published: file(() => Promise.reject(failure)) });

    expect(() => events.emit('published')).not.toThrow();
    await setImmediate();

    expect(log.error).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('logs a listener whose file cannot be loaded, without failing whoever emitted the event', () => {
    const { site, events, log } = createSite();
    const failure = new Error('Cannot find module');
    createApplication({
      providers: [
        defineProvider({
          name: 'example',
          listeners: [
            on('published', () => {
              throw failure;
            }),
          ],
        }),
      ],
    }).listen(site);

    expect(() => events.emit('published')).not.toThrow();
    expect(log.error).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('stops listening when asked, leaving other listeners alone', () => {
    const listener = vi.fn();
    const unrelated = vi.fn();
    const { site, events } = createSite();
    events.on('published', unrelated);
    const stop = listening(site, { published: file(listener) });

    stop();
    events.emit('published');

    expect(listener).not.toHaveBeenCalled();
    expect(unrelated).toHaveBeenCalledTimes(1);
    expect(events.listeners('published')).toEqual([unrelated]);
  });

  it('removes the subscriptions it made when a later one fails', () => {
    const calls: string[] = [];
    const { site } = createSite();
    const events = {
      on(event: string) {
        calls.push(`on ${event}`);
        if (event === 'second') {
          throw new Error('cannot subscribe');
        }
      },
      removeListener: (event: string) => calls.push(`off ${event}`),
    };

    expect(() =>
      listening(
        { ...site, events: events as unknown as Events },
        { first: file(() => {}), second: file(() => {}) },
      ),
    ).toThrow('cannot subscribe');
    expect(calls).toEqual(['on first', 'on second', 'off first', 'off second']);
  });

  it('hands the bus a promise that settles when the listener does, for a bus that waits', async () => {
    const { site, log } = createSite();
    const failure = new Error('delivery failed');
    const handlers: ((...args: unknown[]) => unknown)[] = [];
    const events = {
      on: (_: unknown, handler: (typeof handlers)[number]) => handlers.push(handler),
      removeListener() {},
    };
    createApplication({
      providers: [
        defineProvider({
          name: 'example',
          listeners: [
            on(
              'saved',
              file(async () => 'done'),
            ),
            on(
              'saved',
              file(() => Promise.reject(failure)),
            ),
          ],
        }),
      ],
    }).listen({ ...site, events: events as unknown as Events });

    await expect(handlers[0]!()).resolves.toBe('done');
    await expect(handlers[1]!()).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('subscribes a listener to an event named by its class', () => {
    class PostPublished {}
    const { site } = createSite();
    const subscribed: unknown[] = [];
    const removed: unknown[] = [];
    const events: Events = {
      on: (event) => subscribed.push(event),
      removeListener: (event) => removed.push(event),
    };
    const stop = createApplication({
      providers: [
        defineProvider({
          name: 'example',
          listeners: [
            on(
              PostPublished,
              file(() => {}),
            ),
          ],
        }),
      ],
    }).listen({ ...site, events });

    stop();

    expect(subscribed).toEqual([PostPublished]);
    expect(removed).toEqual([PostPublished]);
  });
});

describe('jobs', () => {
  function runner() {
    const handlers = new Map<string, () => unknown>();
    const scheduled: [string, { cron: string }][] = [];
    const jobs: Jobs = {
      handle: (name, handler) => handlers.set(name, handler),
      scheduleRecurring: (name, schedule) => scheduled.push([name, schedule]),
    };
    return { jobs, handlers, scheduled };
  }

  function work(job: Job) {
    return vi.fn(() => ({ default: job }));
  }

  it('says what to run for every listed job, loading nothing until one runs', async () => {
    const { site } = createSite();
    const job = vi.fn(async () => 'cleaned');
    const load = work(job);
    const { jobs, handlers } = runner();
    const application = createApplication({
      providers: [
        defineProvider({ name: 'example', jobs: { clean: { cron: '0 0 3 * * *', handle: load } } }),
      ],
    });

    application.registerJobs(site, jobs);
    expect([...handlers.keys()]).toEqual(['clean']);
    expect(load).not.toHaveBeenCalled();

    await expect(handlers.get('clean')!()).resolves.toBe('cleaned');
    expect(job).toHaveBeenCalledExactlyOnceWith(site);
  });

  it('lets a job that fails reach the runner', async () => {
    const { site } = createSite();
    const failure = new Error('job failed');
    const { jobs, handlers } = runner();
    createApplication({
      providers: [
        defineProvider({
          name: 'example',
          jobs: { clean: { handle: work(() => Promise.reject(failure)) } },
        }),
      ],
    }).registerJobs(site, jobs);

    await expect(handlers.get('clean')!()).rejects.toBe(failure);
  });

  it('schedules only the jobs that recur', async () => {
    const { jobs, scheduled } = runner();
    const application = createApplication({
      providers: [
        defineProvider({
          name: 'example',
          jobs: {
            clean: { cron: '0 0 3 * * *', handle: work(() => {}) },
            import: { handle: work(() => {}) },
          },
        }),
      ],
    });

    await application.scheduleJobs(jobs);

    expect(scheduled).toEqual([['clean', { cron: '0 0 3 * * *' }]]);
  });

  it('refuses two jobs with one name, which the runner could not tell apart', () => {
    const provider = (name: string) =>
      defineProvider({ name, jobs: { clean: { handle: work(() => {}) } } });

    expect(() => createApplication({ providers: [provider('a'), provider('b')] })).toThrow(
      'Two jobs are both named "clean".',
    );
  });
});
