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
  type SlugProposal,
} from './slug-machine';

function createHarness(generateSlug = vi.fn((text: string) => Promise.resolve(slugify(text)))) {
  const machine = createSlugMachine({ generateSlug });
  const proposals: SlugProposal[] = [];
  machine.subscribe((proposal) => {
    proposals.push(proposal);
  });
  return { machine, generateSlug, proposals };
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
    ['typed number word on current base', 'top-10', 'top 10', 'top', 'top'],
  ])('%s', (_label, serverSlug, candidate, current, expected) => {
    expect(resolveDedupedSlug(serverSlug, candidate, current)).toBe(expected);
  });
});

describe('createSlugMachine', () => {
  describe('loaded', () => {
    it.each([
      ['new blank post', { slug: '', title: '', isNew: true }, 'derived', 'frozen'],
      [
        'saved untitled post',
        { slug: 'untitled', title: DEFAULT_TITLE, isNew: false },
        'derived',
        'frozen',
      ],
      ['derived slug', { slug: 'hello', title: 'Hello', isNew: false }, 'derived', 'derived'],
      ['custom slug', { slug: 'my-slug', title: 'Hello', isNew: false }, 'custom', 'custom'],
      [
        'deduped slug reads as custom',
        { slug: 'hello-2', title: 'Hello', isNew: false },
        'custom',
        'custom',
      ],
      [
        'duplicated post',
        { slug: 'foo-copy-2', title: 'Foo (Copy)', isNew: false },
        'derived',
        'derived',
      ],
    ] as const)('%s', (_label, post, mode, status) => {
      const { machine } = createHarness();
      machine.loaded(post);
      expect(machine.getState()).toEqual({ ...post, mode, status, pending: false });
    });
  });

  describe('titleCommitted', () => {
    it('generates a slug from the committed title and emits it', async () => {
      const { machine, generateSlug, proposals } = createHarness();
      machine.loaded({ slug: '', title: '', isNew: true });

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

    it('keeps following the title after a deduplicated response', async () => {
      const generateSlug = vi.fn().mockResolvedValueOnce('hello-2').mockResolvedValueOnce('world');
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: '', title: '', isNew: true });

      await machine.titleCommitted('Hello');
      expect(machine.getState()).toMatchObject({ slug: 'hello-2', mode: 'derived' });

      await expect(machine.titleCommitted('World')).resolves.toEqual({
        slug: 'world',
        source: 'generated',
      });
    });

    it('ignores an unchanged title when a slug exists', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      await expect(machine.titleCommitted('Hello ')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'same-title',
      });
      expect(generateSlug).not.toHaveBeenCalled();
    });

    it('generates for an unchanged title when the slug is missing', async () => {
      const { machine } = createHarness();
      machine.loaded({ slug: '', title: 'Hello', isNew: false });

      await expect(machine.titleCommitted('Hello')).resolves.toEqual({
        slug: 'hello',
        source: 'generated',
      });
    });

    it('freezes blank titles without calling the generator', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      await expect(machine.titleCommitted('   ')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'frozen',
      });
      expect(generateSlug).not.toHaveBeenCalled();
      expect(machine.getState()).toMatchObject({ slug: 'hello', title: '', status: 'frozen' });
    });

    it('sets the untitled slug once and never again', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: '', title: '', isNew: true });

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
      machine.loaded({ slug: 'untitled-2', title: DEFAULT_TITLE, isNew: false });

      await expect(machine.titleCommitted('Real title')).resolves.toEqual({
        slug: 'real-title',
        source: 'generated',
      });
    });

    it('regenerates when the saved title ended with (Copy)', async () => {
      const { machine } = createHarness();
      machine.loaded({ slug: 'foo-copy-2', title: 'Foo (Copy)', isNew: false });

      await expect(machine.titleCommitted('Bar')).resolves.toEqual({
        slug: 'bar',
        source: 'generated',
      });
    });

    it('never touches a custom slug detected at load', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'my-slug', title: 'Hello', isNew: false });

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
        title: 'Foo (Copy)',
      });
    });

    it('applies only the latest response when commits overlap', async () => {
      const first = deferred<string>();
      const second = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { machine, proposals } = createHarness(generateSlug);
      machine.loaded({ slug: '', title: '', isNew: true });

      const firstCommit = machine.titleCommitted('First');
      const secondCommit = machine.titleCommitted('Second');
      expect(machine.getState()).toMatchObject({ pending: true, title: 'Second' });

      second.resolve('second');
      await expect(secondCommit).resolves.toEqual({ slug: 'second', source: 'generated' });

      first.resolve('first');
      await expect(firstCommit).resolves.toEqual({
        slug: 'second',
        source: 'unchanged',
        reason: 'stale',
      });

      expect(machine.getState()).toMatchObject({ slug: 'second', pending: false });
      expect(proposals.filter((p) => p.source === 'generated')).toEqual([
        { slug: 'second', source: 'generated' },
      ]);
    });

    it('discards a response that resolves before a later commit only if superseded', async () => {
      const first = deferred<string>();
      const second = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: '', title: '', isNew: true });

      const firstCommit = machine.titleCommitted('First');
      const secondCommit = machine.titleCommitted('Second');

      first.resolve('first');
      await expect(firstCommit).resolves.toMatchObject({ source: 'unchanged', reason: 'stale' });
      expect(machine.getState().slug).toBe('');

      second.resolve('second');
      await expect(secondCommit).resolves.toEqual({ slug: 'second', source: 'generated' });
    });

    it('discards in-flight responses when a post is loaded', async () => {
      const pending = deferred<string>();
      const { machine } = createHarness(vi.fn().mockReturnValueOnce(pending.promise));
      machine.loaded({ slug: '', title: '', isNew: true });

      const commit = machine.titleCommitted('Old post');
      machine.loaded({ slug: 'other', title: 'Other', isNew: false });
      pending.resolve('old-post');

      await expect(commit).resolves.toEqual({
        slug: 'other',
        source: 'unchanged',
        reason: 'stale',
      });
      expect(machine.getState().slug).toBe('other');
    });

    it('reports generator failures without changing the slug', async () => {
      const error = new Error('boom');
      const { machine } = createHarness(vi.fn().mockRejectedValueOnce(error));
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'error',
        error,
      });
      expect(machine.getState()).toMatchObject({ slug: 'hello', pending: false });
    });

    it('ignores an empty generator result', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce(''));
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      await expect(machine.titleCommitted('Changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'empty-result',
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
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      await expect(machine.slugEdited(input)).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(generateSlug).not.toHaveBeenCalled();
      expect(machine.getState().mode).toBe('derived');
    });

    it('applies the server result and switches to custom', async () => {
      const { machine, generateSlug, proposals } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      const proposal = await machine.slugEdited('  My Slug ');

      expect(generateSlug).toHaveBeenCalledWith('My Slug');
      expect(proposal).toEqual({ slug: 'my-slug', source: 'manual' });
      expect(proposals).toEqual([proposal]);
      expect(machine.getState()).toMatchObject({
        slug: 'my-slug',
        mode: 'custom',
        status: 'custom',
      });
    });

    it('never regenerates after a manual edit', async () => {
      const { machine, generateSlug } = createHarness();
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });
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
      machine.loaded({ slug: 'whatever', title: 'Whatever', isNew: false });

      await expect(machine.slugEdited('whatever!')).resolves.toEqual({
        slug: 'whatever',
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(machine.getState().mode).toBe('derived');
    });

    it('keeps the current slug when the server sanitizes back to it', async () => {
      const { machine } = createHarness(vi.fn().mockResolvedValueOnce('whatever'));
      machine.loaded({ slug: 'whatever', title: 'Whatever', isNew: false });

      await expect(machine.slugEdited('whatever#slug')).resolves.toMatchObject({
        source: 'unchanged',
        reason: 'reverted',
      });
      expect(machine.getState().mode).toBe('derived');
    });

    it('restores the previous mode when the generator fails', async () => {
      const error = new Error('boom');
      const { machine } = createHarness(vi.fn().mockRejectedValueOnce(error));
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      await expect(machine.slugEdited('changed')).resolves.toEqual({
        slug: 'hello',
        source: 'unchanged',
        reason: 'error',
        error,
      });
      expect(machine.getState()).toMatchObject({ slug: 'hello', mode: 'derived', pending: false });
    });

    it('blocks title generation while a manual edit is in flight', async () => {
      const pending = deferred<string>();
      const generateSlug = vi.fn().mockReturnValueOnce(pending.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      const edit = machine.slugEdited('mine');
      await expect(machine.titleCommitted('Changed')).resolves.toMatchObject({
        source: 'unchanged',
        reason: 'custom',
      });

      pending.resolve('mine');
      await expect(edit).resolves.toEqual({ slug: 'mine', source: 'manual' });
      expect(generateSlug).toHaveBeenCalledTimes(1);
    });

    it('applies only the latest of overlapping manual edits', async () => {
      const first = deferred<string>();
      const second = deferred<string>();
      const generateSlug = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { machine } = createHarness(generateSlug);
      machine.loaded({ slug: 'hello', title: 'Hello', isNew: false });

      const firstEdit = machine.slugEdited('one');
      const secondEdit = machine.slugEdited('two');
      second.resolve('two');
      first.resolve('one');

      await expect(secondEdit).resolves.toEqual({ slug: 'two', source: 'manual' });
      await expect(firstEdit).resolves.toEqual({
        slug: 'two',
        source: 'unchanged',
        reason: 'stale',
      });
    });
  });

  it('stops notifying after unsubscribe', async () => {
    const { machine } = createHarness();
    machine.loaded({ slug: '', title: '', isNew: true });
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);

    await machine.titleCommitted('One');
    unsubscribe();
    await machine.titleCommitted('Two');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      { slug: 'one', source: 'generated' },
      expect.objectContaining({ slug: 'one', status: 'derived' }),
    );
  });
});
