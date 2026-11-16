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

export interface WordSearchOptions {
  /**
   * How many matches FlexSearch keeps from each searchable field (`title`,
   * then `keywords`) before they are merged. The total can be up to twice this
   * number when items have keywords. This is a candidate limit — discard
   * before the caller ranks — not a final result cap. Omit it to keep every
   * match in FlexSearch's ranked order.
   */
  limitPerField?: number;
}

/** Finds the items a term matches. Results are the items themselves. */
export interface TextSearch<T extends Searchable> {
  search(term: string): T[];
}

/** Word search can limit candidates per query while reusing the same index. */
export interface WordSearch<T extends Searchable> extends TextSearch<T> {
  search(term: string, options?: WordSearchOptions): T[];
}

const SEARCH_FIELDS = ['title', 'keywords'] as const;

/**
 * Matches word prefixes in any order, ranked by FlexSearch. Indexes titles and
 * keywords at creation; rebuild when the list changes — in-place edits are not seen.
 */
export function createWordSearch<T extends Searchable>(items: readonly T[]): WordSearch<T> {
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
 * Matches the term as a case-insensitive substring, in source order. Reads the
 * items array on each search, so in-place edits are visible without rebuilding.
 * Returns every match; the caller sorts and caps.
 */
export function createSubstringSearch<T extends Searchable>(items: readonly T[]): TextSearch<T> {
  return {
    search(term) {
      if (!term.trim()) {
        return [];
      }

      const needle = term.toLowerCase();
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(needle) ||
          Boolean(item.keywords?.toLowerCase().includes(needle)),
      );
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
