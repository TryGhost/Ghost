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

  it('keeps the slug for a title the writer did not type, and stops following', async () => {
    const { port, titleReplaced, machine, generateSlug } = harness();

    titleReplaced('An Older Title');

    await expect(port.fromTitle('An Older Title', null, signal())).resolves.toEqual({
      slug: 'original',
      source: 'unchanged',
    });
    await expect(port.fromTitle('Something Else', null, signal())).resolves.toEqual({
      slug: 'original',
      source: 'unchanged',
    });
    expect(machine.getState().slug).toBe('original');
    expect(generateSlug).not.toHaveBeenCalled();
  });

  it('settles immediately when nothing was submitted', async () => {
    const { port } = harness();

    await expect(port.settled()).resolves.toBeUndefined();
  });

  it('waits for a manual edit queued behind title generation', async () => {
    const title = deferred<string>();
    const manual = deferred<string>();
    const generateSlug = vi
      .fn<(text: string) => Promise<string>>()
      .mockReturnValueOnce(title.promise)
      .mockReturnValueOnce(manual.promise);
    const { port, commitTitle, editSlug, machine } = harness(generateSlug);

    commitTitle('First');
    const edit = editSlug('Chosen');
    let settled = false;
    const wait = port.settled().then(() => {
      settled = true;
    });

    title.resolve('first');
    await flush();
    expect(generateSlug).toHaveBeenLastCalledWith('Chosen');
    expect(settled).toBe(false);

    manual.resolve('chosen');
    await edit;
    await wait;
    expect(machine.getState().slug).toBe('chosen');
  });

  it('releases old waits on reload without losing a new submission', async () => {
    const old = deferred<string>();
    const fresh = deferred<string>();
    const generateSlug = vi
      .fn<(text: string) => Promise<string>>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(fresh.promise);
    const { port, editSlug, reset, machine } = harness(generateSlug);

    const oldEdit = editSlug('Old');
    const oldWait = port.settled();
    machine.loaded({ title: 'Reloaded', slug: 'reloaded' });
    reset();
    await oldWait;

    const freshEdit = editSlug('Fresh');
    let settled = false;
    const freshWait = port.settled().then(() => {
      settled = true;
    });
    old.resolve('old');
    expect(await oldEdit).toMatchObject({ source: 'unchanged', reason: 'stale' });
    await flush();
    expect(settled).toBe(false);
    fresh.resolve('fresh');
    await freshEdit;
    await freshWait;
    expect(machine.getState().slug).toBe('fresh');
  });
});
