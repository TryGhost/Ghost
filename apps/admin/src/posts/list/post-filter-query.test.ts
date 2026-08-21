import { describe, expect, it } from 'vitest';
import { POST_FILTER_PARAMS, parsePostFilters, serializePostFilters } from './post-filter-query';
import type { Filter } from '@tryghost/shade/patterns';

/** Ids are asserted separately (they only have to be unique). */
function withoutIds(filters: Filter[]): Array<Omit<Filter, 'id'>> {
  return filters.map(({ id: _id, ...rest }) => rest);
}

// The posts screen is addressed by five discrete URL params rather than one NQL
// string, because sidebar saved views persist exactly that shape and must keep
// working across both the Ember and React implementations. These tests pin the
// round-trip.

describe('POST_FILTER_PARAMS', () => {
  // `order` is a sort, not a filter - it has no operator and would render as
  // a nonsense chip ("Sort is Newest first"), so it lives outside this model.
  it('covers the four filterable params and not order', () => {
    expect(POST_FILTER_PARAMS).toEqual(['type', 'visibility', 'author', 'tag']);
  });
});

describe('parsePostFilters', () => {
  it('returns nothing when no params are set', () => {
    expect(parsePostFilters({})).toEqual([]);
    expect(parsePostFilters({ type: null, visibility: null, author: null, tag: null })).toEqual([]);
  });

  it('turns a param into a single-value "is" filter', () => {
    expect(withoutIds(parsePostFilters({ type: 'draft' }))).toEqual([
      { field: 'type', operator: 'is', values: ['draft'] },
    ]);
  });

  it('emits filters in a stable param order regardless of input order', () => {
    const filters = parsePostFilters({
      tag: 'news',
      type: 'draft',
      author: 'jo',
      visibility: 'paid',
    });

    expect(filters.map((filter) => filter.field)).toEqual(['type', 'visibility', 'author', 'tag']);
  });

  it('gives every filter a distinct id', () => {
    const filters = parsePostFilters({ type: 'draft', tag: 'news' });
    const ids = filters.map((filter) => filter.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores empty strings', () => {
    expect(parsePostFilters({ type: '' })).toEqual([]);
  });

  // A saved view can point at a tag that was later renamed, or at a value a
  // newer Ember build understands. Dropping it would silently rewrite the
  // user's URL and corrupt their view.
  it('keeps values it does not recognise', () => {
    expect(withoutIds(parsePostFilters({ type: 'nonsense', tag: 'deleted-tag' }))).toEqual([
      { field: 'type', operator: 'is', values: ['nonsense'] },
      { field: 'tag', operator: 'is', values: ['deleted-tag'] },
    ]);
  });

  it('treats the paid+tiers visibility value as one opaque value', () => {
    expect(withoutIds(parsePostFilters({ visibility: '[paid,tiers]' }))).toEqual([
      { field: 'visibility', operator: 'is', values: ['[paid,tiers]'] },
    ]);
  });
});

describe('serializePostFilters', () => {
  it('nulls every param when there are no filters', () => {
    expect(serializePostFilters([])).toEqual({
      type: null,
      visibility: null,
      author: null,
      tag: null,
    });
  });

  it('writes a filter value back to its param', () => {
    expect(
      serializePostFilters([{ id: 'type:1', field: 'type', operator: 'is', values: ['draft'] }]),
    ).toEqual({ type: 'draft', visibility: null, author: null, tag: null });
  });

  it('nulls a param whose filter has no value yet', () => {
    // Shade creates a filter as soon as a field is picked, before a value.
    expect(
      serializePostFilters([{ id: 'type:1', field: 'type', operator: 'is', values: [] }]),
    ).toEqual({ type: null, visibility: null, author: null, tag: null });
  });

  it('ignores fields that are not URL params', () => {
    expect(
      serializePostFilters([
        { id: 'order:1', field: 'order', operator: 'is', values: ['published_at asc'] },
      ]),
    ).toEqual({ type: null, visibility: null, author: null, tag: null });
  });

  it('takes the last value when a field somehow appears twice', () => {
    expect(
      serializePostFilters([
        { id: 'type:1', field: 'type', operator: 'is', values: ['draft'] },
        { id: 'type:2', field: 'type', operator: 'is', values: ['published'] },
      ]),
    ).toMatchObject({ type: 'published' });
  });
});

describe('round-tripping', () => {
  it.each([
    {},
    { type: 'draft' },
    { type: 'featured' },
    { visibility: '[paid,tiers]' },
    { type: 'scheduled', visibility: 'members', author: 'jo', tag: 'news' },
    { type: 'nonsense', tag: 'deleted-tag' },
  ])('survives parse then serialize: %j', (params) => {
    const expected = {
      type: null,
      visibility: null,
      author: null,
      tag: null,
      ...params,
    };

    expect(serializePostFilters(parsePostFilters(params))).toEqual(expected);
  });
});
