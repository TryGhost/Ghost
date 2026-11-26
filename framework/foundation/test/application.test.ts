import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { createApplication } from '../src/application.ts';
import { defineProvider } from '#support/define-provider';
import type { Listener } from '#support/define-provider';
import type { Site } from '#support/site';

function createSite(name = 'a') {
  const events = new EventEmitter();
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const site: Site = { id: name, config: { get: (key) => `${name}:${key}` }, log, events };
  return { site, events, log };
}

// Stands in for `() => require('./file')`, and counts how often the file is asked for.
function file(listener: Listener) {
  return vi.fn(() => ({ default: listener }));
}

function listening(site: Site, listeners: Parameters<typeof defineProvider>[0]['listeners']) {
  return createApplication({
    providers: [defineProvider({ name: 'example', listeners })],
  }).listen(site);
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
      listeners: {
        published: [file(() => calls.push('first-a')), file(() => calls.push('first-b'))],
        edited: file(() => calls.push('first-edited')),
      },
    });
    const second = defineProvider({
      name: 'second',
      listeners: { published: file(() => calls.push('second')) },
    });
    createApplication({ providers: [first, second] }).listen(site);

    events.emit('published');

    expect(calls).toEqual(['first-a', 'first-b', 'second']);
  });

  it('keeps two sites apart: each listener is handed the site its event came from', () => {
    const seen: unknown[] = [];
    const provider = defineProvider({
      name: 'example',
      listeners: { published: file((site) => seen.push(site.id)) },
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
    listening(site, {
      published: () => {
        throw failure;
      },
    });

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
      listening({ ...site, events }, { first: file(() => {}), second: file(() => {}) }),
    ).toThrow('cannot subscribe');
    expect(calls).toEqual(['on first', 'on second', 'off first', 'off second']);
  });
});
