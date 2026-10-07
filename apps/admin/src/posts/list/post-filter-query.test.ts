import { describe, expect, it } from 'vitest';
import { POST_FILTER_PARAMS, parsePostFilters, serializePostFilters } from './post-filter-query';
import type { Filter } from '@tryghost/shade/patterns';

/** Ids are asserted separately (they only have to be unique). */
function withoutIds(filters: Filter[]): Array<Omit<Filter, 'id'>> {
  return filters.map(({ id: _id, ...rest }) => rest);
}

// The posts screen is addressed by discrete URL params rather than one NQL
// string, because sidebar saved views persist exactly that shape. These tests
// pin the round-trip.

describe('POST_FILTER_PARAMS', () => {
  // `order` is a sort, not a filter - it has no operator and would render as
  // a nonsense chip ("Sort is Newest first"), so it lives outside this model.
  it('covers the filterable params and not order', () => {
    expect(POST_FILTER_PARAMS).toEqual(['type', 'featured', 'visibility', 'author', 'tag']);
  });
});

describe('parsePostFilters', () => {
  it('returns nothing when no params are set', () => {
    expect(parsePostFilters({})).toEqual([]);
    expect(
      parsePostFilters({ type: null, featured: null, visibility: null, author: null, tag: null }),
    ).toEqual([]);
  });

  it('turns a param into a single-value "is" filter', () => {
    expect(withoutIds(parsePostFilters({ visibility: 'members' }))).toEqual([
      { field: 'visibility', operator: 'is', values: ['members'] },
    ]);
  });

  it('turns a comma-separated type into one "is any of" filter', () => {
    expect(withoutIds(parsePostFilters({ type: 'published,sent' }))).toEqual([
      { field: 'type', operator: 'is_any_of', values: ['published', 'sent'] },
    ]);
  });

  it('turns featured into its own filter', () => {
    expect(withoutIds(parsePostFilters({ type: 'published', featured: 'true' }))).toEqual([
      { field: 'type', operator: 'is_any_of', values: ['published'] },
      { field: 'featured', operator: 'is', values: ['true'] },
    ]);
  });

  it('turns featured=false into an "is not" featured filter', () => {
    expect(withoutIds(parsePostFilters({ featured: 'false' }))).toEqual([
      { field: 'featured', operator: 'is_not', values: ['true'] },
    ]);
  });

  it('has no featured filter for a featured value that is not a boolean', () => {
    expect(parsePostFilters({ featured: 'maybe' })).toEqual([]);
  });

  // Saved views and bookmarks from before featured was its own param.
  it('reads legacy type=featured as a featured filter', () => {
    expect(withoutIds(parsePostFilters({ type: 'featured' }))).toEqual([
      { field: 'featured', operator: 'is', values: ['true'] },
    ]);
  });

  it('lets an explicit featured param win over legacy type=featured', () => {
    expect(withoutIds(parsePostFilters({ type: 'featured', featured: 'false' }))).toEqual([
      { field: 'featured', operator: 'is_not', values: ['true'] },
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

  it('ignores whitespace-only strings', () => {
    expect(parsePostFilters({ tag: '   ' })).toEqual([]);
  });

  // A saved view can point at a tag that was later renamed, or at a value a
  // newer Ember build understands. Dropping it would silently rewrite the
  // user's URL and corrupt their view.
  it('keeps values it does not recognise', () => {
    expect(withoutIds(parsePostFilters({ type: 'nonsense', tag: 'deleted-tag' }))).toEqual([
      { field: 'type', operator: 'is_any_of', values: ['nonsense'] },
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
      featured: null,
      visibility: null,
      author: null,
      tag: null,
    });
  });

  it('writes a filter value back to its param', () => {
    expect(
      serializePostFilters([{ id: 'type:1', field: 'type', operator: 'is', values: ['draft'] }]),
    ).toEqual({ type: 'draft', featured: null, visibility: null, author: null, tag: null });
  });

  it('nulls a param whose filter has no value yet', () => {
    // Shade creates a filter as soon as a field is picked, before a value.
    expect(
      serializePostFilters([{ id: 'type:1', field: 'type', operator: 'is', values: [] }]),
    ).toEqual({ type: null, featured: null, visibility: null, author: null, tag: null });
  });

  it('ignores fields that are not URL params', () => {
    expect(
      serializePostFilters([
        { id: 'order:1', field: 'order', operator: 'is', values: ['published_at asc'] },
      ]),
    ).toEqual({ type: null, featured: null, visibility: null, author: null, tag: null });
  });

  it('takes the last value when a field somehow appears twice', () => {
    expect(
      serializePostFilters([
        { id: 'tag:1', field: 'tag', operator: 'is', values: ['news'] },
        { id: 'tag:2', field: 'tag', operator: 'is', values: ['sport'] },
      ]),
    ).toMatchObject({ tag: 'sport' });
  });

  // One selection, one URL - so a saved view matches however it was clicked.
  it('writes several types in a fixed order, deduplicated', () => {
    expect(
      serializePostFilters([
        {
          id: 'type:1',
          field: 'type',
          operator: 'is_any_of',
          values: ['scheduled', 'nonsense', 'draft', 'draft'],
        },
      ]),
    ).toMatchObject({ type: 'draft,scheduled,nonsense' });
  });
});

describe('round-tripping', () => {
  it.each([
    {},
    { type: 'draft' },
    { type: 'draft,published' },
    { type: 'published', featured: 'true' },
    { featured: 'false' },
    { visibility: '[paid,tiers]' },
    { type: 'scheduled', visibility: 'members', author: 'jo', tag: 'news' },
    { type: 'nonsense', tag: 'deleted-tag' },
  ])('survives parse then serialize: %j', (params) => {
    const expected = {
      type: null,
      featured: null,
      visibility: null,
      author: null,
      tag: null,
      ...params,
    };

    expect(serializePostFilters(parsePostFilters(params))).toEqual(expected);
  });
});

describe('legacy type=featured', () => {
  // The URL is only rewritten once the user changes a filter; until then the
  // query layer reads the legacy value directly.
  it('serialises to the featured param', () => {
    expect(serializePostFilters(parsePostFilters({ type: 'featured' }))).toMatchObject({
      type: null,
      featured: 'true',
    });
  });
});
