import { describe, expect, it, vi } from 'vitest';
import { slugify } from '@tryghost/string';
import { deferred } from '@/utils/deferred';
import { createSlugMachine } from '@/editor/engine/slug-machine';
import { createSlugPort } from './slug-port';

function harness(generateSlug = vi.fn((text: string) => Promise.resolve(slugify(text)))) {
  const machine = createSlugMachine({ generateSlug, onListenerError: vi.fn() });
  machine.loaded({ slug: 'original', title: 'Original' });
  return { machine, generateSlug, ...createSlugPort(machine) };
}

const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

// The engine's signal is only used to abandon work the session already dropped.
const signal = () => new AbortController().signal;

describe('createSlugPort', () => {
  it('resolves a generated proposal from the title', async () => {
    const { port } = harness();

    await expect(port.fromTitle('A New Title', null, signal())).resolves.toEqual({
      slug: 'a-new-title',
      source: 'generated',
    });
  });

  it('reports a refused commit as unchanged', async () => {
    const { port } = harness();

    await expect(port.fromTitle('Original', null, signal())).resolves.toEqual({
      slug: 'original',
      source: 'unchanged',
    });
  });

  it('answers a superseded commit with the slug the machine holds', async () => {
    const active = deferred<string>();
    const generateSlug = vi
      .fn<(text: string) => Promise<string>>()
      .mockReturnValueOnce(active.promise)
      .mockImplementation((text) => Promise.resolve(slugify(text)));
    const { port, commitTitle, machine } = harness(generateSlug);

    commitTitle('First');
    const superseded = port.fromTitle('Second', null, signal());
    commitTitle('Third');
    active.resolve('first');

    // The stale answer never proposes a slug of its own; the engine re-reads
    // the snapshot instead.
    await expect(superseded).resolves.toEqual({
      slug: machine.getState().slug,
      source: 'unchanged',
    });
    await port.settled();
    expect(machine.getState().slug).toBe('third');
  });

  it('settles on the latest submission rather than the pending flag', async () => {
    const active = deferred<string>();
    const queued = deferred<string>();
    const generateSlug = vi
      .fn<(text: string) => Promise<string>>()
      .mockReturnValueOnce(active.promise)
      .mockReturnValueOnce(queued.promise);
    const { port, commitTitle, machine } = harness(generateSlug);

    commitTitle('First');
    commitTitle('Second');

    let settled = false;
    void port.settled().then(() => {
      settled = true;
    });

    active.resolve('first');
    await flush();
    expect(settled).toBe(false);
    expect(machine.getState().pending).toBe(true);

    queued.resolve('second');
    await flush();
    expect(settled).toBe(true);
    expect(machine.getState().slug).toBe('second');
  });

  it('settles immediately when nothing was submitted', async () => {
    const { port } = harness();

    await expect(port.settled()).resolves.toBeUndefined();
  });
});
