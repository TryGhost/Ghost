import { describe, expect, it } from 'vitest';
import { getPostSelectionFilter, type PostSelection } from './post-selection-filter';

/**
 * The highest-stakes string in the port: this is what gets appended to
 * `DELETE /posts/?filter=` and `PUT /posts/bulk?filter=`. A wrong branch here
 * doesn't misrender something — it edits or deletes the wrong posts.
 *
 * Ported branch-for-branch from the `filter` getter in
 * `apps/ember-admin/app/components/posts-list/selection-list.js`.
 */

const selection = (overrides: Partial<PostSelection> = {}): PostSelection => ({
  selectedIds: new Set<string>(),
  inverted: false,
  ...overrides,
});

describe('getPostSelectionFilter', () => {
  // Not the empty string: an empty filter means "everything", so getting this
  // branch wrong turns "delete nothing" into "delete the whole site".
  it('matches nothing when nothing is selected', () => {
    expect(getPostSelectionFilter(selection(), '')).toBe('id:nothing');
  });

  it('still matches nothing when a filter is active but nothing is selected', () => {
    expect(getPostSelectionFilter(selection(), 'status:draft')).toBe('id:nothing');
  });

  it('lists the ids of an ordinary selection', () => {
    expect(getPostSelectionFilter(selection({ selectedIds: new Set(['a', 'b']) }), '')).toBe(
      "id:['a','b']",
    );
  });

  // An ordinary selection ignores the list's filter entirely — the ids are
  // already the complete answer.
  it('ignores the active filter for an ordinary selection', () => {
    expect(getPostSelectionFilter(selection({ selectedIds: new Set(['a']) }), 'status:draft')).toBe(
      "id:['a']",
    );
  });

  describe('after Select All', () => {
    // Empty means unbounded, which is exactly right here and exactly wrong
    // in the "nothing selected" case above.
    it('matches everything when the list is unfiltered', () => {
      expect(getPostSelectionFilter(selection({ inverted: true }), '')).toBe('');
    });

    it('matches the list filter when one is active', () => {
      expect(getPostSelectionFilter(selection({ inverted: true }), 'status:draft')).toBe(
        'status:draft',
      );
    });

    // The parenthesis matters: without it the `+` would bind against the
    // last term of the filter rather than the whole of it.
    it('subtracts deselected ids from the list filter', () => {
      expect(
        getPostSelectionFilter(
          selection({ inverted: true, selectedIds: new Set(['a', 'b']) }),
          'status:draft',
        ),
      ).toBe("(status:draft)+id:-['a','b']");
    });

    it('subtracts deselected ids with no filter to intersect', () => {
      expect(
        getPostSelectionFilter(selection({ inverted: true, selectedIds: new Set(['a']) }), ''),
      ).toBe("id:-['a']");
    });
  });

  // Insertion order, as Ember's Set does — so the string is stable across
  // renders and a request can be compared against an expectation.
  it('emits ids in the order they were selected', () => {
    const ids = new Set<string>();
    ids.add('c');
    ids.add('a');
    ids.add('b');

    expect(getPostSelectionFilter(selection({ selectedIds: ids }), '')).toBe("id:['c','a','b']");
  });
});
