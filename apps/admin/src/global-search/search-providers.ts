// Lazily loaded with the Cmd-K modal: a static import from shell code would
// put FlexSearch in Admin's main bundle.
// eslint-disable-next-line no-restricted-imports -- see comment above
import {
  type TextSearch,
  type TextSearchOptions,
  createSubstringSearch,
  createWordSearch,
  isWordSearchLocale,
} from '@/shared/text-search';
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

function createProvider(
  sources: readonly SearchSource[],
  createSearch: (items: readonly SearchItem[]) => TextSearch<SearchItem>,
  searchOptions: TextSearchOptions = {},
): SearchProvider {
  const searches = sources.map((source) => createSearch(source.items));

  return {
    search(term) {
      return groupResults(sources, (_source, index) => searches[index].search(term, searchOptions));
    },
  };
}

/** Groups each source's word-prefix matches. */
export function createFlexSearchProvider(sources: readonly SearchSource[]): SearchProvider {
  return createProvider(sources, createWordSearch, { limitPerField: RESULT_LIMIT });
}

/** Groups each source's substring matches. */
export function createBasicSearchProvider(sources: readonly SearchSource[]): SearchProvider {
  // No early cut: every match reaches the status sort, then groupResults caps.
  return createProvider(sources, createSubstringSearch);
}

/** Groups each source's matches, matched as the site's locale suits. */
export function createSearchProvider(
  sources: readonly SearchSource[],
  locale: string | null | undefined,
): SearchProvider {
  return isWordSearchLocale(locale)
    ? createFlexSearchProvider(sources)
    : createBasicSearchProvider(sources);
}
