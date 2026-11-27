import { describe, expect, it } from 'vitest';
import { pick } from './pick';

describe('pick', () => {
  it('copies only the keys it is given', () => {
    const source = { id: 'abc', title: 'Hello', slug: 'hello', featured: false };

    expect(pick(source, ['title', 'featured'])).toEqual({ title: 'Hello', featured: false });
  });

  it('keeps a key whose value is undefined', () => {
    const source: { title: string; slug?: string } = { title: 'Hello', slug: undefined };
    const picked = pick(source, ['slug']);

    expect('slug' in picked).toBe(true);
    expect(picked.slug).toBeUndefined();
  });

  it('materialises a key the source does not carry', () => {
    const source: { title: string; slug?: string } = { title: 'Hello' };
    const picked = pick(source, ['slug']);

    expect('slug' in picked).toBe(true);
    expect(picked.slug).toBeUndefined();
  });

  it('copies values by reference rather than cloning them', () => {
    const tags = [{ id: 'tag-1' }];
    const picked = pick({ tags, title: 'Hello' }, ['tags']);

    expect(picked.tags).toBe(tags);
  });

  it('answers with an empty object for no keys', () => {
    expect(pick({ title: 'Hello' }, [])).toEqual({});
  });
});
