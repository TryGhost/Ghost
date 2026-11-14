// The only module allowed to import FlexSearch. Callers must import this file
// from a lazily loaded module so FlexSearch stays out of Admin's main bundle.
// eslint-disable-next-line no-restricted-imports -- see comment above
import FlexSearch from 'flexsearch';

export interface Searchable {
  /** Unique within one search. */
  id: string;
  title: string;
  /** Space-separated words that also match, ranked after title matches. */
  keywords?: string;
}

export interface TextSearchOptions {
  /**
   * How many matches to keep from each searchable field (`title`, then
   * `keywords`). Results are merged in that order and deduped by id, so the
   * total can be up to twice this number when items have keywords. Omit it to
   * keep every match: substring search stays in source order, and word search
   * stays in FlexSearch's ranked order.
   */
  limitPerField?: number;
}

/** Finds the items a term matches. Results are the items themselves. */
export interface TextSearch<T extends Searchable> {
  search(term: string, options?: TextSearchOptions): T[];
}

const SEARCH_FIELDS = ['title', 'keywords'] as const;

function mergeFieldMatches<T extends Searchable>(
  items: readonly T[],
  fieldMatches: ReadonlyArray<readonly T[]>,
): T[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const ids = new Set(fieldMatches.flatMap((matches) => matches.map((item) => item.id)));
  return [...ids].flatMap((id) => itemsById.get(id) ?? []);
}

/**
 * Matches word prefixes in any order, ranked by FlexSearch. Indexes titles and
 * keywords at creation; rebuild when the list changes — in-place edits are not seen.
 */
export function createWordSearch<T extends Searchable>(items: readonly T[]): TextSearch<T> {
  const index = new FlexSearch.Document<T>({
    tokenize: 'forward',
    document: { id: 'id', index: [...SEARCH_FIELDS] },
  });
  items.forEach((item) => index.add(item));
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return {
    search(term, { limitPerField = items.length } = {}) {
      const ids = new Set(
        index.search(term, limitPerField).flatMap((field) => field.result.map(String)),
      );

      return [...ids].flatMap((id) => itemsById.get(id) ?? []);
    },
  };
}

/**
 * Matches the term as a case-insensitive substring. Reads the items array on
 * each search, so in-place edits are visible without rebuilding.
 */
export function createSubstringSearch<T extends Searchable>(items: readonly T[]): TextSearch<T> {
  return {
    search(term, { limitPerField } = {}) {
      if (!term.trim()) {
        return [];
      }

      const needle = term.toLowerCase();
      const matchesField = (item: T, field: (typeof SEARCH_FIELDS)[number]) => {
        const value = item[field];
        return typeof value === 'string' && value.toLowerCase().includes(needle);
      };

      // No early cut: keep source order, whether the hit was on title or keywords.
      if (limitPerField === undefined) {
        return items.filter((item) => SEARCH_FIELDS.some((field) => matchesField(item, field)));
      }

      // Per-field caps merge title matches first, then keyword matches. A hit on
      // both fields takes a slot in each before dedupe.
      const fieldMatches = SEARCH_FIELDS.map((field) => {
        const matches: T[] = [];
        for (const item of items) {
          if (matches.length >= limitPerField) {
            break;
          }
          if (matchesField(item, field)) {
            matches.push(item);
          }
        }
        return matches;
      });

      return mergeFieldMatches(items, fieldMatches);
    },
  };
}

/** FlexSearch's word tokenizer only suits English; substring matching works for any language. */
export function isWordSearchLocale(locale: string | null | undefined): boolean {
  return locale?.toLowerCase().startsWith('en') ?? true;
}

/**
 * Picks word or substring search from the site's locale. Rebuild when the list
 * identity changes; word search snapshots at create time.
 */
export function createTextSearch<T extends Searchable>(
  items: readonly T[],
  locale: string | null | undefined,
): TextSearch<T> {
  return isWordSearchLocale(locale) ? createWordSearch(items) : createSubstringSearch(items);
}
