import { describe, expect, it } from 'vitest';
import {
  addTag,
  canCreateTag,
  isInternalTag,
  normalizeTagName,
  removeTag,
  sameTag,
  sortTagsByName,
  tagKey,
} from './tag-selection';

describe('normalizeTagName', () => {
  it('drops the space around a typed name', () => {
    expect(normalizeTagName('  News  ')).toBe('News');
    expect(normalizeTagName('   ')).toBe('');
  });
});

describe('tagKey', () => {
  it('identifies a saved tag by id and a typed one by its lowercased name', () => {
    expect(tagKey({ id: 't1', name: 'News' })).toBe('t1');
    expect(tagKey({ name: 'News' })).toBe('new:news');
    expect(tagKey({ name: 'NEWS' })).toBe('new:news');
  });
});

describe('sameTag', () => {
  it('separates two tags that share a name but not a slug', () => {
    expect(sameTag({ id: 't1', name: 'News' }, { id: 't2', name: 'News' })).toBe(false);
    expect(sameTag({ id: 't1', name: 'News' }, { id: 't1', name: 'Renamed' })).toBe(true);
  });

  it('falls back to the name when either side was only typed', () => {
    expect(sameTag({ id: 't1', name: 'News' }, { name: 'news' })).toBe(true);
    expect(sameTag({ name: 'News' }, { name: 'Sport' })).toBe(false);
  });
});

describe('isInternalTag', () => {
  it('reads a leading hash as internal before the server says so', () => {
    expect(isInternalTag({ name: '#hidden' })).toBe(true);
    expect(isInternalTag({ name: 'News', visibility: 'internal' })).toBe(true);
    expect(isInternalTag({ name: 'News', visibility: 'public' })).toBe(false);
  });
});

describe('addTag', () => {
  it('appends to the end, which is the order Ghost stores', () => {
    const tags = [{ id: 't1', name: 'News' }];

    expect(addTag(tags, { id: 't2', name: 'Sport' })).toEqual([
      { id: 't1', name: 'News' },
      { id: 't2', name: 'Sport' },
    ]);
  });

  it('takes a second tag of the same name when it is a different tag', () => {
    const tags = [{ id: 't1', name: 'News' }];

    expect(addTag(tags, { id: 't2', name: 'News' })).toEqual([
      { id: 't1', name: 'News' },
      { id: 't2', name: 'News' },
    ]);
  });

  it('refuses the tag it already carries, and a typed name matching one', () => {
    const tags = [{ id: 't1', name: 'News' }];

    expect(addTag(tags, { id: 't1', name: 'News' })).toBe(tags);
    expect(addTag(tags, { name: 'NEWS' })).toBe(tags);
  });

  it('refuses an empty name', () => {
    const tags = [{ id: 't1', name: 'News' }];

    expect(addTag(tags, { name: '' })).toBe(tags);
  });
});

describe('removeTag', () => {
  it('removes one tag and leaves the order of the rest alone', () => {
    const tags = [{ id: 't1', name: 'News' }, { id: 't2', name: 'Sport' }, { name: 'Typed' }];

    expect(removeTag(tags, 't2')).toEqual([{ id: 't1', name: 'News' }, { name: 'Typed' }]);
    expect(removeTag(tags, 'new:typed')).toEqual([
      { id: 't1', name: 'News' },
      { id: 't2', name: 'Sport' },
    ]);
  });
});

describe('sortTagsByName', () => {
  it('files an internal tag under its letters rather than above every name', () => {
    const sorted = sortTagsByName([{ name: 'Apple' }, { name: '#Bees' }, { name: 'Cider' }]);

    expect(sorted.map((tag) => tag.name)).toEqual(['Apple', '#Bees', 'Cider']);
  });
});

describe('canCreateTag', () => {
  it('offers a term nothing else carries', () => {
    expect(canCreateTag('Culture', [{ id: 't1', name: 'News' }], [])).toBe(true);
  });

  it('refuses a term an offered or selected tag already carries', () => {
    expect(canCreateTag('news', [{ id: 't1', name: 'News' }], [])).toBe(false);
    expect(canCreateTag('news', [], [{ id: 't1', name: 'News' }])).toBe(false);
    expect(canCreateTag('', [], [])).toBe(false);
  });
});
