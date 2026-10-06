import { describe, expect, it } from 'vitest';
import { buildPostFilterFields } from './use-post-filter-fields';
import type { ValueSource } from '@tryghost/shade/patterns';

const stubSource = {
  id: 'stub',
  useOptions: () => ({
    options: [],
    isInitialLoad: false,
    isSearching: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: () => {},
  }),
} as ValueSource<string>;

function build(
  overrides: Parameters<typeof buildPostFilterFields>[0] extends infer T ? Partial<T> : never = {},
) {
  return buildPostFilterFields({
    resource: 'posts',
    authorValueSource: stubSource,
    tagValueSource: stubSource,
    ...overrides,
  });
}

const keysOf = (fields: ReturnType<typeof buildPostFilterFields>) =>
  fields.map((field) => field.key);

describe('buildPostFilterFields', () => {
  it('offers the filterable params, in order', () => {
    expect(keysOf(build())).toEqual(['type', 'featured', 'visibility', 'author', 'tag']);
  });

  // Sorting is not a filter — it has no operator and belongs in its own
  // control, so it must never appear as a chip.
  it('never offers order as a filter', () => {
    expect(keysOf(build())).not.toContain('order');
  });

  it('labels the type field for the resource', () => {
    expect(build().find((field) => field.key === 'type')?.label).toBe('Post type');
    expect(build({ resource: 'pages' }).find((field) => field.key === 'type')?.label).toBe(
      'Page type',
    );
  });

  it('drops "email only" from the type options on pages', () => {
    const values = (fields: ReturnType<typeof buildPostFilterFields>) =>
      fields.find((field) => field.key === 'type')?.options?.map((option) => option.value);

    expect(values(build())).toContain('sent');
    expect(values(build({ resource: 'pages' }))).not.toContain('sent');
  });

  // Ember hides visibility, author and tag for contributors, and author for
  // authors too — they only ever see their own posts.
  it('hides visibility, author and tag from contributors', () => {
    expect(keysOf(build({ isContributor: true }))).toEqual(['type', 'featured']);
  });

  it('hides the author filter from authors', () => {
    expect(keysOf(build({ isAuthorOrContributor: true }))).toEqual([
      'type',
      'featured',
      'visibility',
      'tag',
    ]);
  });

  it('lets type match any of several values', () => {
    const type = build().find((field) => field.key === 'type');

    expect(type?.type).toBe('multiselect');
    expect(type?.operators?.map((operator) => operator.value)).toEqual(['is_any_of']);
  });

  // Reads "Post is Featured" / "Post is not Featured".
  it('makes featured a flag whose operator carries the value', () => {
    const featured = build().find((field) => field.key === 'featured');

    expect(featured?.label).toBe('Featured');
    expect(featured?.pillLabel).toBe('Post');
    expect(featured?.operators?.map((operator) => operator.value)).toEqual(['is', 'is_not']);
    expect(featured?.defaultValue).toBe('true');
    expect(build({ resource: 'pages' }).find((field) => field.key === 'featured')?.pillLabel).toBe(
      'Page',
    );
  });

  it('uses single-select equality for every other field', () => {
    build()
      .filter((field) => field.key !== 'type' && field.key !== 'featured')
      .forEach((field) => {
        expect(field.operators?.map((operator) => operator.value)).toEqual(['is']);
      });
  });

  it('adds an unknown option per unrecognised type value', () => {
    const options = build({ params: { type: 'draft,nonsense' } })
      .find((field) => field.key === 'type')
      ?.options?.map((option) => [option.value, option.label]);

    expect(options).toContainEqual(['nonsense', 'Unknown type']);
    expect(options).not.toContainEqual(['draft', 'Unknown type']);
  });

  // Legacy `?type=featured` surfaces as a Featured chip, so it is not an
  // unknown type.
  it('does not treat legacy type=featured as an unknown type', () => {
    const labels = build({ params: { type: 'featured' } })
      .find((field) => field.key === 'type')
      ?.options?.map((option) => option.label);

    expect(labels).not.toContain('Unknown type');
  });

  it('gives author and tag async value sources rather than fixed options', () => {
    const author = build().find((field) => field.key === 'author');
    const tag = build().find((field) => field.key === 'tag');

    expect(author?.valueSource).toBe(stubSource);
    expect(tag?.valueSource).toBe(stubSource);
    expect(author?.options).toBeUndefined();
  });

  it('carries the paid+tiers visibility value as one opaque option', () => {
    expect(
      build()
        .find((field) => field.key === 'visibility')
        ?.options?.map((option) => option.value),
    ).toEqual(['public', 'members', '[paid,tiers]']);
  });
});
