import { describe, expect, it, vi } from 'vitest';
import { slugify } from '@tryghost/string';
import { deferred } from '@/utils/deferred';
import { DEFAULT_TITLE } from './save-engine';
import {
  createSlugMachine,
  isCustomSlug,
  normalizeManualSlug,
  resolveDedupedSlug,
  shouldGenerateSlug,
  type SlugMachineState,
  type SlugProposal,
} from './slug-machine';

function createHarness(
  generateSlug = vi.fn((text: string) => Promise.resolve(slugify(text))),
  onListenerError = vi.fn(),
) {
  const machine = createSlugMachine({ generateSlug, onListenerError });
  const proposals: SlugProposal[] = [];
  const events: Array<{ state: SlugMachineState; proposal: SlugProposal | null }> = [];
  machine.subscribe((state, proposal) => {
    events.push({ state, proposal });
    if (proposal) {
      proposals.push(proposal);
    }
  });
  return { machine, generateSlug, onListenerError, proposals, events };
}

describe('isCustomSlug', () => {
  it.each([
    ['', 'Hello', false],
    ['hello', 'Hello', false],
    ['hello-world', 'Hello World!', false],
    ['unicode-ttitle', 'Ünïcödé Ttitle', false],
    ['my-own-slug', 'Hello', true],
    ['hello-2', 'Hello', true],
    ['whatever', DEFAULT_TITLE, false],
    ['untitled-3', DEFAULT_TITLE, false],
    ['foo-copy-2', 'Foo (Copy)', false],
    ['anything', 'Foo (Copy)', false],
    ['anything', 'Foo (copy)', true],
    ['anything', '', true],
  ])('slug %j with saved title %j → custom: %s', (slug, title, expected) => {
    expect(isCustomSlug(slug, title)).toBe(expected);
  });
});

describe('shouldGenerateSlug', () => {
  it.each([
    ['custom mode', { mode: 'custom', slug: 'x' }, 'New title', false],
    ['custom mode without slug', { mode: 'custom', slug: '' }, 'New title', false],
    ['blank title', { mode: 'derived', slug: 'x' }, '', false],
    ['whitespace title', { mode: 'derived', slug: 'x' }, '   ', false],
    ['untitled with slug', { mode: 'derived', slug: 'untitled' }, DEFAULT_TITLE, false],
    [
      'padded untitled with slug',
      { mode: 'derived', slug: 'untitled' },
      ` ${DEFAULT_TITLE} `,
      false,
    ],
    ['untitled without slug', { mode: 'derived', slug: '' }, DEFAULT_TITLE, true],
    ['normal title', { mode: 'derived', slug: 'old' }, 'New title', true],
    ['copy-suffixed title', { mode: 'derived', slug: 'foo-copy' }, 'Foo (Copy)', true],
  ] as const)('%s', (_label, state, title, expected) => {
    expect(shouldGenerateSlug(state, title)).toBe(expected);
  });
});

describe('normalizeManualSlug', () => {
  it.each([
    ['', 'slug', null],
    ['   ', 'slug', null],
    ['slug', 'slug', null],
    ['slug  ', 'slug', null],
    ['', '', null],
    ['  changed  ', 'slug', 'changed'],
    ['Hello World', 'slug', 'Hello World'],
  ])('input %j with current %j → %j', (input, current, expected) => {
    expect(normalizeManualSlug(input, current)).toBe(expected);
  });
});

describe('resolveDedupedSlug', () => {
  it.each([
    ['server returns current', 'whatever', 'whatever#slug', 'whatever', 'whatever'],
    ['server appends increment to current', 'whatever-2', 'whatever!', 'whatever', 'whatever'],
    ['user typed the incremented value', 'whatever-2', 'whatever-2', 'whatever', 'whatever-2'],
    ['increment on a hyphenated current', 'a-b-3', 'a b', 'a-b', 'a-b'],
    ['zero is not an increment', 'whatever-0', 'whatever 0', 'whatever', 'whatever-0'],
    ['trailing number that is a different base', 'other-2', 'other', 'whatever', 'other-2'],
    ['distinct slug', 'changed', 'changed', 'whatever', 'changed'],
    ['typed number word on current base', 'top-10', 'top 10', 'top', 'top-10'],
    ['numeric result on an empty current slug', '2', '2!', '', '2'],
  ])('%s', (_label, serverSlug, candidate, current, expected) => {
    expect(resolveDedupedSlug(serverSlug, candidate, current)).toBe(expected);
  });
});

describe('createSlugMachine', () => {
  describe('loaded', () => {
    it.each([
      ['new blank post', { slug: '', title: '' }, 'derived', 'frozen'],
      ['saved untitled post', { slug: 'untitled', title: DEFAULT_TITLE }, 'derived', 'frozen'],
      ['derived slug', { slug: 'hello', title: 'Hello' }, 'derived', 'derived'],
      ['custom slug', { slug: 'my-slug', title: 'Hello' }, 'custom', 'custom'],
      ['deduped slug reads as custom', { slug: 'hello-2', title: 'Hello' }, 'custom', 'custom'],
      ['duplicated post', { slug: 'foo-copy-2', title: 'Foo (Copy)' }, 'derived', 'derived'],
    ] as const)('%s', (_label, post, mode, status) => {
      const { machine, events } = createHarness();
      machine.loaded(post);
      const expected = { ...post, lastCommittedTitle: post.title, mode, status, pending: false };
      expect(machine.getState()).toEqual(expected);
      expect(events).toEqual([{ state: expected, proposal: null }]);
    });
  });

  describe('titleCommitted', () => {
    it('generates a slug from the committed title and emits it', async () => {
      const { machine, generateSlug, proposals } = createHarness();
      machine.loaded({ slug: '', title: '' });

      const proposal = await machine.titleCommitted('  Hello World  ');

      expect(generateSlug).toHaveBeenCalledWith('Hello World');
      expect(proposal).toEqual({ slug: 'hello-world', source: 'generated' });
      expect(proposals).toEqual([proposal]);
      expect(machine.getState()).toMatchObject({
        slug: 'hello-world',
        title: 'Hello World',
        status: 'derived',
      });
    });

    it('notifies when a request starts and when it settles', async () => {
      const pending = deferred<string>();
      const { machine, events } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
      machine.loaded({ slug: '', title: '' });
      events.length = 0;

      const commit = machine.titleCommitted('Hello');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ state: { pending: true }, proposal: null });

      pending.resolve('hello');
      await commit;
      expect(events).toHaveLength(2);
      expect(events[1]).toMatchObject({
        state: { pending: false, slug: 'hello' },
        proposal: { slug: 'hello', source: 'generated' },
      });
    });

    it('keeps following the title after a deduplicated response', async () => {
      const generateSlug = vi.fn().mockResolvedValueOnce('hello-2').mockResolvedValueOnce('world');
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: '', title: '' });

      await machine.titleCommitted('Hello');
      expect(machine.getState()).toMatchObject({ slug: 'hello-2', mode: 'derived' });

      await expect(machine.titleCommitted('World')).resolves.toEqual({
        slug: 'world',
        source: 'generated',
      });
    });

    it('ignores an unchanged title when a slug exists', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.titleCommitted('Hello ')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'same-title',
      });
      expect(generateSlug).not.toHaveBeenCalled();
    });

    it('discards an in-flight generation when the title returns to the generated title', async () => {
      const pending = deferred<string>();
      const { machine, events, proposals } = createHarness(
        vi.fn().mockReturnValueOnce(pending.promise),
      );
      machine.loaded({ slug: 'hello', title: 'Hello' });
      events.length = 0;

      const commit = machine.titleCommitted('Changed');
      await expect(machine.titleCommitted('Hello')).resolves.toMatchObject({
        source: 'unchanged',
        reason: 'same-title',
      });
      const eventCount = events.length;
      pending.resolve('changed');

      await expect(commit).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'stale',
      });
      expect(machine.getState()).toMatchObject({
        slug: 'hello',
        title: 'Hello',
        lastCommittedTitle: 'Hello',
        pending: false,
      });
      expect(proposals.filter((proposal) => proposal.source === 'generated')).toEqual([]);
      expect(events).toHaveLength(eventCount);
      expect(events.at(-1)).toMatchObject({
        state: { pending: false },
        proposal: { reason: 'same-title' },
      });
    });

    it('discards an in-flight generation when a later title is frozen', async () => {
      const pending = deferred<string>();
      const { machine } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const commit = machine.titleCommitted('Changed');
      await expect(machine.titleCommitted('')).resolves.toMatchObject({
        source: 'unchanged',
        reason: 'frozen',
      });
      pending.resolve('changed');

      await expect(commit).resolves.toMatchObject({ source: 'unchanged', reason: 'stale' });
      expect(machine.getState()).toMatchObject({
        slug: 'hello',
        title: 'Hello',
        lastCommittedTitle: '',
        pending: false,
      });
    });

    it('generates for an unchanged title when the slug is missing', async () => {
      const { machine } = createHarness();
      machine.loaded({ slug: '', title: 'Hello' });

      await expect(machine.titleCommitted('Hello')).resolves.toEqual({
        slug: 'hello',
        source: 'generated',
      });
    });

    it('freezes blank titles without calling the generator', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.titleCommitted('   ')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'frozen',
      });
      expect(generateSlug).not.toHaveBeenCalled();
      expect(machine.getState()).toMatchObject({
        slug: 'hello',
        title: 'Hello',
        lastCommittedTitle: '',
        status: 'frozen',
      });
    });

    it('reports derived after a failed commit on an untitled post', async () => {
      const { machine } = createHarness(vi.fn().mockRejectedValueOnce(new Error('boom')));
      machine.loaded({ slug: 'untitled', title: DEFAULT_TITLE });
      expect(machine.getState().status).toBe('frozen');

      await expect(machine.titleCommitted('Hello')).resolves.toMatchObject({ reason: 'error' });

      expect(machine.getState()).toMatchObject({
        status: 'derived',
        title: DEFAULT_TITLE,
        lastCommittedTitle: 'Hello',
        slug: 'untitled',
      });
    });

    it('stops reporting pending for the previous post once a new one loads', async () => {
      const pending = deferred<string>();
      const { machine } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
      machine.loaded({ slug: '', title: '' });

      const commit = machine.titleCommitted('Old post');
      expect(machine.getState().pending).toBe(true);

      machine.loaded({ slug: 'other', title: 'Other' });
      expect(machine.getState().pending).toBe(false);

      pending.resolve('old-post');
      await expect(commit).resolves.toMatchObject({ reason: 'stale' });
      expect(machine.getState().pending).toBe(false);
    });

    it('sets the untitled slug once and never again', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: '', title: '' });

      await expect(machine.titleCommitted(DEFAULT_TITLE)).resolves.toEqual({
        slug: 'untitled',
        source: 'generated',
      });
      await machine.titleCommitted('Draft');
      await expect(machine.titleCommitted(DEFAULT_TITLE)).resolves.toEqual({
        slug: 'draft',
        source: 'unchanged',
        reason: 'frozen',
      });
      expect(generateSlug).toHaveBeenCalledTimes(2);
    });

    it('regenerates when the saved title was (Untitled)', async () => {
      const { machine } = createHarness();
      machine.loaded({ slug: 'untitled-2', title: DEFAULT_TITLE });

      await expect(machine.titleCommitted('Real title')).resolves.toEqual({
        slug: 'real-title',
        source: 'generated',
      });
    });

    it('regenerates when the saved title ended with (Copy)', async () => {
      const { machine } = createHarness();
      machine.loaded({ slug: 'foo-copy-2', title: 'Foo (Copy)' });

      await expect(machine.titleCommitted('Bar')).resolves.toEqual({
        slug: 'bar',
        source: 'generated',
      });
    });

    it('never touches a custom slug detected at load', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'my-slug', title: 'Hello' });

      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'my-slug',
        source: 'unchanged',
        reason: 'custom',
      });
      await machine.titleCommitted(DEFAULT_TITLE);
      await machine.titleCommitted('Foo (Copy)');
      expect(generateSlug).not.toHaveBeenCalled();
      expect(machine.getState()).toMatchObject({
        slug: 'my-slug',
        status: 'custom',
        title: 'Hello',
      });
    });

    it('serializes overlapping title commits', async () => {
      const first = deferred<string>();
      const second = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { machine, proposals } = createHarness(generateSlug);
      machine.loaded({ slug: '', title: '' });

      const firstCommit = machine.titleCommitted('First');
      const secondCommit = machine.titleCommitted('Second');
      expect(machine.getState()).toMatchObject({ pending: true, title: '' });

      first.resolve('first');
      await expect(firstCommit).resolves.toEqual({
        slug: 'first',
        source: 'generated',
      });
      expect(generateSlug).toHaveBeenCalledTimes(2);

      second.resolve('second');
      await expect(secondCommit).resolves.toEqual({ slug: 'second', source: 'generated' });

      expect(machine.getState()).toMatchObject({ slug: 'second', title: 'Second', pending: false });
      expect(proposals.filter((p) => p.source === 'generated')).toEqual([
        { slug: 'first', source: 'generated' },
        { slug: 'second', source: 'generated' },
      ]);
    });

    it('retains only the latest deferred title commit', async () => {
      const first = deferred<string>();
      const third = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(third.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: '', title: '' });

      const firstCommit = machine.titleCommitted('First');
      const secondCommit = machine.titleCommitted('Second');
      const thirdCommit = machine.titleCommitted('Third');

      await expect(secondCommit).resolves.toMatchObject({ source: 'unchanged', reason: 'stale' });
      expect(generateSlug).toHaveBeenCalledTimes(1);

      first.resolve('first');
      await expect(firstCommit).resolves.toEqual({ slug: 'first', source: 'generated' });
      expect(generateSlug).toHaveBeenCalledTimes(2);

      third.resolve('third');
      await expect(thirdCommit).resolves.toEqual({ slug: 'third', source: 'generated' });
      expect(machine.getState()).toMatchObject({ slug: 'third', title: 'Third', pending: false });
    });

    it('discards in-flight responses when a post is loaded', async () => {
      const pending = deferred<string>();
      const { machine, events } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
      machine.loaded({ slug: '', title: '' });

      const commit = machine.titleCommitted('Old post');
      machine.loaded({ slug: 'other', title: 'Other' });
      events.length = 0;
      pending.resolve('old-post');

      await expect(commit).resolves.toEqual({
        slug: '',
        source: 'unchanged',
        reason: 'stale',
      });
      expect(machine.getState().slug).toBe('other');
      expect(events).toEqual([]);
    });

    it('reports generator failures without changing the slug', async () => {
      const error = new Error('boom');
      const { machine } = createHarness(vi.fn().mockRejectedValueOnce(error));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'error',
        error,
      });
      expect(machine.getState()).toMatchObject({ slug: 'hello', title: 'Hello', pending: false });
    });

    it('retries the same title after a generator failure', async () => {
      const generateSlug = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce('changed');
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.titleCommitted('Changed')).resolves.toMatchObject({ reason: 'error' });
      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'changed',
        source: 'generated',
      });
      expect(generateSlug).toHaveBeenCalledTimes(2);
    });

    it('ignores an empty generator result', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce(''));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'empty-result',
      });
    });

    it('ignores a whitespace-only title result', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce('   '));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'empty-result',
      });
      expect(machine.getState()).toMatchObject({ slug: 'hello', title: 'Hello', mode: 'derived' });
    });

    it.each(['', 'hello'])(
      'does not let a no-op manual %j cancel title generation',
      async (input) => {
        const pending = deferred<string>();
        const { machine } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
        machine.loaded({ slug: 'hello', title: 'Hello' });

        const commit = machine.titleCommitted('Changed');
        await expect(machine.slugEdited(input)).resolves.toMatchObject({
          source: 'unchanged',
          reason: 'reverted',
        });
        expect(machine.getState()).toMatchObject({ mode: 'derived', pending: true });

        pending.resolve('changed');
        await expect(commit).resolves.toEqual({ slug: 'changed', source: 'generated' });
      },
    );

    it('keeps title generation when a deferred manual edit is withdrawn', async () => {
      const pending = deferred<string>();
      const generateSlug = vi.fn().mockReturnValueOnce(pending.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const commit = machine.titleCommitted('Changed');
      const manual = machine.slugEdited('mine');
      await expect(machine.slugEdited('')).resolves.toMatchObject({ reason: 'reverted' });
      await expect(manual).resolves.toMatchObject({ reason: 'stale' });
      expect(generateSlug).toHaveBeenCalledTimes(1);

      pending.resolve('changed');
      await expect(commit).resolves.toEqual({ slug: 'changed', source: 'generated' });
      expect(machine.getState()).toMatchObject({
        slug: 'changed',
        mode: 'derived',
        pending: false,
      });
    });
  });

  describe('slugEdited', () => {
    it.each([
      ['', 'blank'],
      ['   ', 'whitespace'],
      ['hello', 'unchanged'],
      ['hello  ', 'padded unchanged'],
    ])('reverts a %j (%s) edit without calling the generator', async (input) => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.slugEdited(input)).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(generateSlug).not.toHaveBeenCalled();
      expect(machine.getState().mode).toBe('derived');
    });

    it.each([
      ['', 'blank'],
      ['hello', 'current slug'],
    ])('discards an in-flight manual edit when a later edit reverts to %j (%s)', async (input) => {
      const pending = deferred<string>();
      const { machine, proposals } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const edit = machine.slugEdited('mine');
      await expect(machine.slugEdited(input)).resolves.toMatchObject({
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(machine.getState()).toMatchObject({ mode: 'derived', pending: false });
      pending.resolve('mine');

      await expect(edit).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'stale',
      });
      expect(machine.getState()).toMatchObject({
        slug: 'hello',
        mode: 'derived',
        pending: false,
      });
      expect(proposals.filter((proposal) => proposal.source === 'manual')).toEqual([]);
    });

    it('generates from the title after an invalidated manual request settles', async () => {
      const pending = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce('changed');
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const edit = machine.slugEdited('mine');
      await machine.slugEdited('hello');
      const commit = machine.titleCommitted('Changed');

      pending.resolve('mine');
      await expect(edit).resolves.toMatchObject({ source: 'unchanged', reason: 'stale' });
      await expect(commit).resolves.toEqual({
        slug: 'changed',
        source: 'generated',
      });
      expect(machine.getState()).toMatchObject({
        slug: 'changed',
        mode: 'derived',
        pending: false,
      });

      expect(machine.getState()).toMatchObject({ slug: 'changed', pending: false });
    });

    it('applies the server result and switches to custom', async () => {
      const { machine, generateSlug, proposals } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const proposal = await machine.slugEdited('  My Slug ');

      expect(generateSlug).toHaveBeenCalledWith('My Slug');
      expect(proposal).toEqual({ slug: 'my-slug', source: 'manual' });
      expect(proposals).toEqual([proposal]);
      expect(machine.getState()).toMatchObject({
        slug: 'my-slug',
        mode: 'custom',
        status: 'custom',
        title: 'Hello',
      });
    });

    it('never regenerates after a manual edit', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello' });
      await machine.slugEdited('custom');

      await expect(machine.titleCommitted('Another title')).resolves.toEqual({
        slug: 'custom',
        source: 'unchanged',
        reason: 'custom',
      });
      await machine.titleCommitted(DEFAULT_TITLE);
      expect(generateSlug).toHaveBeenCalledTimes(1);
    });

    it('keeps the current slug when the server only appended an increment', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce('whatever-2'));
      machine.loaded({ slug: 'whatever', title: 'Whatever' });

      await expect(machine.slugEdited('whatever!')).resolves.toEqual({
        slug: 'whatever',
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(machine.getState().mode).toBe('derived');
    });

    it('keeps the current slug when the server sanitizes back to it', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce('whatever'));
      machine.loaded({ slug: 'whatever', title: 'Whatever' });

      await expect(machine.slugEdited('whatever#slug')).resolves.toMatchObject({
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(machine.getState().mode).toBe('derived');
    });

    it('ignores a whitespace-only manual result', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce('   '));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      await expect(machine.slugEdited('changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'empty-result',
      });
      expect(machine.getState()).toMatchObject({ slug: 'hello', mode: 'derived' });
    });

    it('returns to derived when the generator fails', async () => {
      const error = new Error('boom');
      const { machine } = createHarness(vi.fn().mockRejectedValueOnce(error));
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const edit = machine.slugEdited('changed');
      expect(machine.getState().mode).toBe('custom');
      await expect(edit).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'error',
        error,
      });
      expect(machine.getState()).toMatchObject({ slug: 'hello', mode: 'derived', pending: false });
    });

    it('defers title generation while a manual edit is in flight', async () => {
      const pending = deferred<string>();
      const generateSlug = vi.fn().mockReturnValueOnce(pending.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const edit = machine.slugEdited('mine');
      const commit = machine.titleCommitted('Changed');

      pending.resolve('mine');
      await expect(edit).resolves.toEqual({ slug: 'mine', source: 'manual' });
      await expect(commit).resolves.toMatchObject({ source: 'unchanged', reason: 'custom' });
      expect(generateSlug).toHaveBeenCalledTimes(1);
    });

    it('runs a deferred title commit when the in-flight manual edit fails', async () => {
      const pending = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce('changed');
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const edit = machine.slugEdited('mine');
      const commit = machine.titleCommitted('Changed');

      pending.reject(new Error('boom'));
      await expect(edit).resolves.toMatchObject({ reason: 'error' });
      await expect(commit).resolves.toEqual({
        slug: 'changed',
        source: 'generated',
      });
      expect(machine.getState()).toMatchObject({
        mode: 'derived',
        slug: 'changed',
        title: 'Changed',
      });
    });

    it('finishes title generation before running a deferred manual edit', async () => {
      const generation = deferred<string>();
      const edit = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(generation.promise)
        .mockReturnValueOnce(edit.promise)
        .mockResolvedValueOnce('changed');
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const commit = machine.titleCommitted('Changed');
      const manual = machine.slugEdited('mine');
      edit.reject(new Error('boom'));
      generation.resolve('changed');

      await expect(manual).resolves.toMatchObject({ reason: 'error' });
      await expect(commit).resolves.toEqual({
        slug: 'changed',
        source: 'generated',
      });
      expect(machine.getState()).toMatchObject({
        mode: 'derived',
        slug: 'changed',
        title: 'Changed',
      });
    });

    it('serializes overlapping manual edits', async () => {
      const first = deferred<string>();
      const second = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const firstEdit = machine.slugEdited('one');
      const secondEdit = machine.slugEdited('two');
      first.resolve('one');

      await expect(firstEdit).resolves.toEqual({ slug: 'one', source: 'manual' });
      second.resolve('two');
      await expect(secondEdit).resolves.toEqual({ slug: 'two', source: 'manual' });
      expect(machine.getState().mode).toBe('custom');
    });

    it('retains only the latest deferred manual edit', async () => {
      const first = deferred<string>();
      const third = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(third.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello' });

      const firstEdit = machine.slugEdited('one');
      const secondEdit = machine.slugEdited('two');
      const thirdEdit = machine.slugEdited('three');

      await expect(secondEdit).resolves.toMatchObject({ source: 'unchanged', reason: 'stale' });
      first.resolve('one');
      await expect(firstEdit).resolves.toEqual({ slug: 'one', source: 'manual' });
      third.resolve('three');
      await expect(thirdEdit).resolves.toEqual({ slug: 'three', source: 'manual' });
      expect(machine.getState()).toMatchObject({ slug: 'three', mode: 'custom', pending: false });
    });
  });

  it('stops notifying after unsubscribe', async () => {
    const { machine } = createHarness();
    machine.loaded({ slug: '', title: '' });
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);

    await machine.titleCommitted('One');
    unsubscribe();
    await machine.titleCommitted('Two');

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ slug: 'one', status: 'derived', pending: false }),
      { slug: 'one', source: 'generated' },
    );
  });

  it('isolates subscriber failures from transitions and other subscribers', async () => {
    const generateSlug = vi.fn().mockResolvedValue('changed');
    const onListenerError = vi.fn();
    const { machine, events } = createHarness(generateSlug, onListenerError);
    machine.loaded({ slug: 'hello', title: 'Hello' });
    machine.subscribe(() => {
      throw new Error('listener failed');
    });
    const laterListener = vi.fn();
    machine.subscribe(laterListener);

    await expect(machine.titleCommitted('Changed')).resolves.toEqual({
      slug: 'changed',
      source: 'generated',
    });
    expect(onListenerError).toHaveBeenCalledTimes(2);
    expect(laterListener).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toMatchObject({ state: { pending: false, slug: 'changed' } });
    expect(machine.getState()).toMatchObject({ pending: false, mode: 'derived', slug: 'changed' });
  });

  it('keeps a manual response atomic with its pending custom mode', async () => {
    const pending = deferred<string>();
    const generateSlug = vi.fn().mockReturnValueOnce(pending.promise);
    const { machine } = createHarness(generateSlug);
    machine.loaded({ slug: 'hello', title: 'Hello' });

    const edit = machine.slugEdited('mine');
    const interleavedCommit = pending.promise.then(() => machine.titleCommitted('Changed'));
    pending.resolve('mine');

    await expect(edit).resolves.toEqual({ slug: 'mine', source: 'manual' });
    await expect(interleavedCommit).resolves.toMatchObject({
      source: 'unchanged',
      reason: 'custom',
    });
    expect(generateSlug).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toMatchObject({ slug: 'mine', mode: 'custom', pending: false });
  });
});
