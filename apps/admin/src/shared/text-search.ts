// pulls in FlexSearch, so import this only from a lazily loaded module
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
   * How many matches word search ranks for each field. Substring search
   * doesn't rank, so it returns every match for the caller to order and cap.
   */
  limit: number;
}

/** Finds the items a term matches. Results are the items themselves. */
export interface TextSearch<T extends Searchable> {
  search(term: string, options: TextSearchOptions): T[];
}

/** Matches word prefixes in any order, ranked by FlexSearch. */
export function createWordSearch<T extends Searchable>(items: readonly T[]): TextSearch<T> {
  const index = new FlexSearch.Document<T>({
    tokenize: 'forward',
    document: { id: 'id', index: ['title', 'keywords'] },
  });
  items.forEach((item) => index.add(item));
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return {
    search(term, { limit }) {
      const ids = new Set(index.search(term, limit).flatMap((field) => field.result.map(String)));

      return [...ids].flatMap((id) => itemsById.get(id) ?? []);
    },
  };
}

/** Matches the term as a case-insensitive substring, in item order. */
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
export function createTextSearch<T extends Searchable>(
  items: readonly T[],
  locale: string | null | undefined,
): TextSearch<T> {
  const isEnglish = locale?.toLowerCase().startsWith('en') ?? true;

  return isEnglish ? createWordSearch(items) : createSubstringSearch(items);
}
