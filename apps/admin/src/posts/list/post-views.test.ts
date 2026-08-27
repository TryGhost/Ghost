import { describe, expect, it } from 'vitest';
import {
  POST_VIEW_COLORS,
  buildPostView,
  buildPostViewsForDelete,
  buildPostViewsForSave,
  canSavePostView,
  findActivePostView,
} from './post-views';
import { hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import type { SharedView } from '@/members/api';

const view = (name: string, filter: Record<string, string | null>): SharedView => ({
  name,
  route: 'posts',
  filter,
  color: 'blue',
});

describe('canSavePostView', () => {
  // Ember gates the save button on: admin, on the posts screen, not already
  // on a default view, and at least one param set.
  it('allows an admin with a filter set', () => {
    expect(
      canSavePostView({
        isAdmin: true,
        resource: 'posts',
        params: { type: 'draft' },
        isDefaultView: false,
      }),
    ).toBe(true);
  });

  it('refuses a non-admin', () => {
    expect(
      canSavePostView({
        isAdmin: false,
        resource: 'posts',
        params: { type: 'draft' },
        isDefaultView: false,
      }),
    ).toBe(false);
  });

  // Ember's `isAdmin` is `or(isOwnerOnly, isAdminOnly)`, so the Owner counts.
  // The framework's `isAdminUser` is Administrator *only*, and using it here
  // hid the button from the site owner — the person most likely to be saving
  // views. Asserted through the same call the screen makes, so swapping the
  // helper back would fail this rather than quietly pass.
  it.each([
    { role: 'Owner', expected: true },
    { role: 'Administrator', expected: true },
    { role: 'Editor', expected: false },
    { role: 'Author', expected: false },
  ])('lets a $role save a view: $expected', ({ role, expected }) => {
    const user = { roles: [{ name: role as 'Owner' }] };

    expect(
      canSavePostView({
        isAdmin: hasAdminAccess(user),
        resource: 'posts',
        params: { type: 'draft' },
        isDefaultView: false,
      }),
    ).toBe(expected);
  });

  // The button is hardcoded to `currentRouteName === 'posts'` in Ember, so
  // pages never offer it.
  it('refuses on the pages screen', () => {
    expect(
      canSavePostView({
        isAdmin: true,
        resource: 'pages',
        params: { type: 'draft' },
        isDefaultView: false,
      }),
    ).toBe(false);
  });

  it('refuses with nothing filtered', () => {
    expect(
      canSavePostView({
        isAdmin: true,
        resource: 'posts',
        params: {},
        isDefaultView: false,
      }),
    ).toBe(false);
  });

  // Sorting counts here, unlike the empty state's "showingAll".
  it('allows a sort on its own', () => {
    expect(
      canSavePostView({
        isAdmin: true,
        resource: 'posts',
        params: { order: 'published_at asc' },
        isDefaultView: false,
      }),
    ).toBe(true);
  });

  it('refuses while a default view is active', () => {
    expect(
      canSavePostView({
        isAdmin: true,
        resource: 'posts',
        params: { type: 'draft' },
        isDefaultView: true,
      }),
    ).toBe(false);
  });
});

describe('buildPostView', () => {
  it('stores the params verbatim, so Ember reads the same view', () => {
    expect(buildPostView('News', { type: 'draft', tag: 'news' }, 'blue')).toEqual({
      name: 'News',
      route: 'posts',
      color: 'blue',
      filter: { type: 'draft', tag: 'news' },
    });
  });

  it('trims the name', () => {
    expect(buildPostView('  News  ', { type: 'draft' }, 'blue').name).toBe('News');
  });

  it('drops empty params so the filter compares equal to a clean URL', () => {
    expect(buildPostView('News', { type: 'draft', tag: null, order: '' }, 'blue').filter).toEqual({
      type: 'draft',
    });
  });

  it('only uses colours Ember knows', () => {
    POST_VIEW_COLORS.forEach((color) => {
      expect(buildPostView('X', { type: 'draft' }, color).color).toBe(color);
    });
  });
});

describe('buildPostViewsForSave', () => {
  it('appends a new view', () => {
    const result = buildPostViewsForSave([], 'News', { type: 'draft' }, 'blue');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('News');
  });

  it('rejects a duplicate name on the same route', () => {
    expect(() =>
      buildPostViewsForSave([view('News', { type: 'draft' })], 'News', { tag: 'other' }, 'blue'),
    ).toThrow(/already exists/i);
  });

  // Views are per-route, so members and pages names don't collide.
  it('allows the same name on another route', () => {
    const existing: SharedView = { name: 'News', route: 'members', filter: { filter: 'x' } };

    expect(buildPostViewsForSave([existing], 'News', { type: 'draft' }, 'blue')).toHaveLength(2);
  });

  it('replaces the original when editing', () => {
    const original = view('News', { type: 'draft' });
    const result = buildPostViewsForSave(
      [original],
      'Renamed',
      { type: 'published' },
      'red',
      original,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'Renamed', filter: { type: 'published' } });
  });

  it('leaves other views untouched when editing', () => {
    const original = view('News', { type: 'draft' });
    const other = view('Other', { tag: 'x' });
    const result = buildPostViewsForSave(
      [other, original],
      'Renamed',
      { type: 'published' },
      'red',
      original,
    );

    expect(result[0]).toEqual(other);
  });
});

describe('buildPostViewsForDelete', () => {
  it('removes the view', () => {
    const target = view('News', { type: 'draft' });

    expect(buildPostViewsForDelete([target, view('Other', { tag: 'x' })], target)).toEqual([
      view('Other', { tag: 'x' }),
    ]);
  });

  it('throws when the view is gone', () => {
    expect(() => buildPostViewsForDelete([], view('News', { type: 'draft' }))).toThrow(
      /could not be found/i,
    );
  });
});

describe('findActivePostView', () => {
  it('finds the view whose filter matches the URL exactly', () => {
    const views = [view('News', { type: 'draft', tag: 'news' }), view('Drafts', { type: 'draft' })];

    expect(findActivePostView(views, { type: 'draft' })?.name).toBe('Drafts');
  });

  it('finds nothing when no view matches', () => {
    expect(
      findActivePostView([view('Drafts', { type: 'draft' })], { tag: 'news' }),
    ).toBeUndefined();
  });
});
