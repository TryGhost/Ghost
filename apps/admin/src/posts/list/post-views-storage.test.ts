import { describe, expect, it } from 'vitest';
import { applyPostViewDelete, applyPostViewSave } from './post-views-storage';
import type { SharedView } from '@/members/api';

/**
 * Views for members, posts and pages all live in ONE `shared_views` setting,
 * so a post-view save has to round-trip everything else untouched.
 *
 * The obvious implementation — parse, validate, re-serialize — silently
 * deletes any entry that fails validation, including ones written by a future
 * Ghost version. These tests exist because that is data loss the user would
 * never be warned about.
 */

const postsView = (name: string, filter: Record<string, string>): SharedView => ({
  name,
  route: 'posts',
  color: 'blue',
  filter,
});

const parse = (json: string) => JSON.parse(json) as unknown[];

describe('applyPostViewSave', () => {
  it('appends a new view', () => {
    const result = parse(applyPostViewSave('[]', 'News', { tag: 'news' }, 'blue'));

    expect(result).toEqual([
      { name: 'News', route: 'posts', color: 'blue', filter: { tag: 'news' } },
    ]);
  });

  it("leaves other screens' views exactly as they were", () => {
    const existing = JSON.stringify([
      { name: 'VIPs', route: 'members', filter: { filter: 'label:vip' } },
    ]);
    const result = parse(applyPostViewSave(existing, 'News', { tag: 'news' }, 'blue'));

    expect(result[0]).toEqual({ name: 'VIPs', route: 'members', filter: { filter: 'label:vip' } });
  });

  // The whole point: an entry this build can't validate must survive.
  it('preserves an entry that fails validation', () => {
    const existing = JSON.stringify([
      { name: 'Broken', route: 'members' },
      { totally: 'unrecognised' },
    ]);
    const result = parse(applyPostViewSave(existing, 'News', { tag: 'news' }, 'blue'));

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'Broken', route: 'members' });
    expect(result[1]).toEqual({ totally: 'unrecognised' });
  });

  // A future version may add fields this build doesn't know about.
  it('preserves unknown fields on entries it does not touch', () => {
    const existing = JSON.stringify([
      { name: 'Future', route: 'members', filter: { filter: 'x' }, icon: 'star', somethingNew: 42 },
    ]);
    const result = parse(applyPostViewSave(existing, 'News', { tag: 'news' }, 'blue'));

    expect(result[0]).toMatchObject({ icon: 'star', somethingNew: 42 });
  });

  it('replaces the original when editing, in place', () => {
    const original = postsView('News', { tag: 'news' });
    const existing = JSON.stringify([
      { name: 'VIPs', route: 'members', filter: { filter: 'x' } },
      original,
    ]);
    const result = parse(
      applyPostViewSave(existing, 'Renamed', { tag: 'other' }, 'blue', original),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ route: 'members' });
    expect(result[1]).toMatchObject({ name: 'Renamed', filter: { tag: 'other' } });
  });

  it('rejects a duplicate name on the same route', () => {
    const existing = JSON.stringify([postsView('News', { tag: 'news' })]);

    expect(() => applyPostViewSave(existing, 'News', { tag: 'other' }, 'blue')).toThrow(
      /already exists/i,
    );
  });

  // Rather than treating it as an empty list and wiping the lot.
  it('refuses to write when the stored value is not an array', () => {
    expect(() => applyPostViewSave('{"not":"an array"}', 'News', { tag: 'news' }, 'blue')).toThrow(
      /could not be read/i,
    );
  });

  it('refuses to write when the stored value is unparseable', () => {
    expect(() => applyPostViewSave('not json at all', 'News', { tag: 'news' }, 'blue')).toThrow(
      /could not be read/i,
    );
  });
});

describe('applyPostViewDelete', () => {
  it('removes only the target', () => {
    const target = postsView('News', { tag: 'news' });
    const existing = JSON.stringify([
      { name: 'VIPs', route: 'members', filter: { filter: 'x' } },
      target,
    ]);
    const result = parse(applyPostViewDelete(existing, target));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ route: 'members' });
  });

  it('preserves unvalidatable entries', () => {
    const target = postsView('News', { tag: 'news' });
    const existing = JSON.stringify([{ totally: 'unrecognised' }, target]);
    const result = parse(applyPostViewDelete(existing, target));

    expect(result).toEqual([{ totally: 'unrecognised' }]);
  });

  it('throws when the view is already gone', () => {
    expect(() => applyPostViewDelete('[]', postsView('News', { tag: 'news' }))).toThrow(
      /could not be found/i,
    );
  });

  it('refuses to write when the stored value is unreadable', () => {
    expect(() => applyPostViewDelete('nonsense', postsView('News', { tag: 'news' }))).toThrow(
      /could not be read/i,
    );
  });
});
