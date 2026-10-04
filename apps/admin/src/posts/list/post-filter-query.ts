import {
  LEGACY_FEATURED_TYPE,
  type PostListParams,
  getFeaturedValue,
  splitTypeParam,
} from './post-query-params';
import { getTypeOptions } from './post-filter-fields';
import type { Filter } from '@tryghost/shade/patterns';

/**
 * Bridges the posts/pages URL params and the Shade `Filters` chip model.
 *
 * Unlike members, which round-trips a single NQL `?filter=` string, posts are
 * addressed by discrete params (`?type=draft&tag=news`). That shape is fixed:
 * sidebar saved views persist exactly it. So this is a small dedicated codec
 * rather than a use of `@/shared/filters`' NQL engine.
 *
 * `order` is deliberately absent: it is a sort, not a filter, so it has no
 * operator and would read as a nonsense chip. It is carried alongside these.
 */

export const POST_FILTER_PARAMS = ['type', 'featured', 'visibility', 'author', 'tag'] as const;

export type PostFilterParam = (typeof POST_FILTER_PARAMS)[number];

export type PostFilterParamValues = Record<PostFilterParam, string | null>;

const EMPTY_PARAMS: PostFilterParamValues = {
  type: null,
  featured: null,
  visibility: null,
  author: null,
  tag: null,
};

/** `type` matches any of its values; every other field is single-select. */
const OPERATOR = 'is';
export const TYPE_OPERATOR = 'is_any_of';

/** Fixed order so one selection always writes one URL, whatever the click order. */
const TYPE_ORDER = getTypeOptions('posts').map((option) => option.value);

function isFilterParam(field: string): field is PostFilterParam {
  return (POST_FILTER_PARAMS as readonly string[]).includes(field);
}

/**
 * Values are carried through verbatim, including ones we don't recognise: a
 * saved view may point at a since-renamed tag, or at a value only a newer
 * build understands. Dropping it would silently rewrite the user's URL.
 */
export function parsePostFilters(params: PostListParams): Filter<string>[] {
  return POST_FILTER_PARAMS.flatMap((param, index) => {
    const values = paramValues(params, param);

    if (values.length === 0) {
      return [];
    }

    // Ids only have to be unique and stable for a given params record;
    // the param name already is.
    const operator = param === 'type' ? TYPE_OPERATOR : OPERATOR;
    return [{ id: `${param}:${index + 1}`, field: param, operator, values }];
  });
}

/** Legacy `?type=featured` surfaces as a Featured chip, not a type value. */
function paramValues(params: PostListParams, param: PostFilterParam): string[] {
  if (param === 'type') {
    return splitTypeParam(params.type).filter((value) => value !== LEGACY_FEATURED_TYPE);
  }

  const value = param === 'featured' && !params.featured ? getFeaturedValue(params) : params[param];

  if (value === null || value === undefined || value.trim() === '') {
    return [];
  }

  return [value];
}

function typeOrder(value: string): number {
  const index = TYPE_ORDER.indexOf(value);
  return index === -1 ? TYPE_ORDER.length : index;
}

function toTypeParamValue(values: unknown[]): string | null {
  const types = [...new Set(values.map(toParamValue).filter((value) => value !== null))];
  types.sort((a, b) => typeOrder(a) - typeOrder(b));

  return types.length > 0 ? types.join(',') : null;
}

/**
 * URL params are strings. Anything else a chip might carry is not
 * representable in the URL, so it clears the param rather than serialising as
 * "[object Object]".
 */
function toParamValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value === '' ? null : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

/**
 * The inverse. A filter with no value yet - Shade creates one as soon as a
 * field is picked - clears its param rather than writing an empty one.
 */
export function serializePostFilters(filters: Filter<string>[]): PostFilterParamValues {
  const params: PostFilterParamValues = { ...EMPTY_PARAMS };

  filters.forEach((filter) => {
    if (!isFilterParam(filter.field)) {
      return;
    }

    params[filter.field] =
      filter.field === 'type' ? toTypeParamValue(filter.values) : toParamValue(filter.values[0]);
  });

  return params;
}
