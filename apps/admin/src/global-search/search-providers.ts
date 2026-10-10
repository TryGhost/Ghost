import FlexSearch from 'flexsearch';
import type { SearchItem, SearchResultGroup, SearchSource } from './search-source';

export interface SearchProvider {
  search(term: string): SearchResultGroup[];
}

// every option is rendered, so each group is capped
const RESULT_LIMIT = 100;

function groupResults(
  sources: readonly SearchSource[],
  match: (source: SearchSource, index: number) => SearchItem[],
): SearchResultGroup[] {
  return sources.flatMap((source, index) => {
    const matches = match(source, index);
    const items = (source.compare ? [...matches].sort(source.compare) : matches).slice(
      0,
      RESULT_LIMIT,
    );

    return items.length > 0 ? [{ id: source.id, heading: source.heading, items }] : [];
  });
}

/** Matches word prefixes in any order, ranked by FlexSearch. */
export function createFlexSearchProvider(sources: readonly SearchSource[]): SearchProvider {
  const indexes = sources.map((source) => {
    const index = new FlexSearch.Document<SearchItem>({
      tokenize: 'forward',
      document: { id: 'id', index: ['title', 'keywords'] },
    });
    source.items.forEach((item) => index.add(item));
    return { index, itemsById: new Map(source.items.map((item) => [item.id, item])) };
  });

  return {
    search(term) {
      return groupResults(sources, (_source, sourceIndex) => {
        const { index, itemsById } = indexes[sourceIndex];
        const ids = new Set(
          index.search(term, RESULT_LIMIT).flatMap((field) => field.result.map(String)),
        );

        return [...ids].flatMap((id) => itemsById.get(id) ?? []);
      });
    },
  };
}

/** Matches the term as a case-insensitive substring, in source order. */
export function createBasicSearchProvider(sources: readonly SearchSource[]): SearchProvider {
  return {
    search(term) {
      if (!term.trim()) {
        return [];
      }

      const needle = term.toLowerCase();

      return groupResults(sources, (source) =>
        source.items.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            Boolean(item.keywords?.toLowerCase().includes(needle)),
        ),
      );
    },
  };
}

/** FlexSearch's word tokenizer only suits English; substring matching works for any language. */
export function createSearchProvider(
  sources: readonly SearchSource[],
  locale: string | null | undefined,
): SearchProvider {
  const isEnglish = locale?.toLowerCase().startsWith('en') ?? true;

  return isEnglish ? createFlexSearchProvider(sources) : createBasicSearchProvider(sources);
}
