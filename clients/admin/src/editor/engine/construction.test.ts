import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { slugify } from '@tryghost/string';
import { createChangeTracker } from './change-tracker';
import {
  createSaveEngine,
  type SaveOutcome,
  type SaveRequest,
  type SaveSnapshot,
  type SlugPort,
} from './save-engine';
import { createSlugMachine } from './slug-machine';
import { BASE, BASELINE, flush } from './__test-utils__/engine-harness';

// React StrictMode may build these twice and drop the first without disposing
// it, so construction must start nothing.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function spyingEnginePorts() {
  const slug = {
    settled: vi.fn(() => Promise.resolve()),
    fromTitle: vi.fn(() => Promise.resolve({ slug: BASE.slug, source: 'unchanged' as const })),
  } satisfies SlugPort;
  return {
    getSnapshot: vi.fn(() => ({ ...BASE }) as SaveSnapshot),
    slug,
    prepare: vi.fn((request: SaveRequest) =>
      Promise.resolve({ ok: true as const, prepared: request }),
    ),
    execute: vi.fn((prepared: SaveRequest): Promise<SaveOutcome> =>
      Promise.resolve({
        ok: true,
        result: { id: 'post-1', status: prepared.target.status, updatedAt: BASELINE },
      }),
    ),
    reconcile: vi.fn(),
    autosaveDebounceMs: vi.fn(() => undefined),
    onStateChange: vi.fn(),
    onListenerError: vi.fn(),
  };
}

describe('createSaveEngine construction', () => {
  it('calls no port and arms no timer', async () => {
    const ports = spyingEnginePorts();
    const timers = { setTimeout: vi.fn(), clearTimeout: vi.fn() };

    const engine = createSaveEngine({ ...ports, ...timers });
    await flush();

    for (const port of [
      ports.getSnapshot,
      ports.slug.settled,
      ports.slug.fromTitle,
      ports.prepare,
      ports.execute,
      ports.reconcile,
      ports.autosaveDebounceMs,
      ports.onStateChange,
      ports.onListenerError,
      timers.setTimeout,
      timers.clearTimeout,
    ]) {
      expect(port).not.toHaveBeenCalled();
    }
    expect(vi.getTimerCount()).toBe(0);
    expect(engine.getState()).toEqual({ kind: 'idle' });
  });

  it('leaves a second engine fully working when the first is discarded undisposed', async () => {
    const ports = spyingEnginePorts();

    createSaveEngine(ports);
    const engine = createSaveEngine(ports);
    expect(vi.getTimerCount()).toBe(0);

    void engine.dispatch('autosave');
    await vi.advanceTimersByTimeAsync(3000);

    expect(ports.execute).toHaveBeenCalledTimes(1);
    expect(ports.reconcile).toHaveBeenCalledTimes(1);
    expect(ports.onListenerError).not.toHaveBeenCalled();
  });
});

describe('createSlugMachine construction', () => {
  it('requests no slug, reports nothing and arms no timer', async () => {
    const generateSlug = vi.fn((text: string) => Promise.resolve(slugify(text)));
    const onListenerError = vi.fn();

    const machine = createSlugMachine({ generateSlug, onListenerError });
    await flush();

    expect(generateSlug).not.toHaveBeenCalled();
    expect(onListenerError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(machine.getState().pending).toBe(false);
  });

  it('leaves a second machine fully working when the first is discarded undisposed', async () => {
    const generateSlug = vi.fn((text: string) => Promise.resolve(slugify(text)));
    const onListenerError = vi.fn();

    createSlugMachine({ generateSlug, onListenerError }).loaded({ slug: '', title: '' });
    const machine = createSlugMachine({ generateSlug, onListenerError });
    machine.loaded({ slug: '', title: '' });

    const proposal = await machine.titleCommitted('Hello world');

    expect(generateSlug).toHaveBeenCalledTimes(1);
    expect(proposal).toMatchObject({ slug: 'hello-world', source: 'generated' });
    expect(onListenerError).not.toHaveBeenCalled();
  });
});

describe('createChangeTracker construction', () => {
  it('arms no timer', async () => {
    createChangeTracker({ siteUrl: 'https://example.com' });
    await flush();

    expect(vi.getTimerCount()).toBe(0);
  });
});
