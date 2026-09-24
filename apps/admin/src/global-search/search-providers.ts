import FlexSearch from 'flexsearch';
import {
  type SearchIndexItem,
  type SearchItem,
  type SearchResult,
  type SearchResultGroup,
  type Searchable,
  type SearchableModel,
  createSearchResult,
  sortSearchResultsByStatus,
} from './searchables';

/** `search-index/*` entries by model. Billing items come from config, not content. */
export type SearchContent = Partial<
  Record<Exclude<SearchableModel, 'pro-page'>, SearchIndexItem[]>
>;

export interface SearchProvider {
  search(term: string): SearchResultGroup[];
}

// every option is rendered, so each group is capped
const RESULT_LIMIT = 100;

function itemsFor(searchable: Searchable, content: SearchContent): SearchItem[] {
  if (searchable.model === 'pro-page') {
    return searchable.staticItems ?? [];
  }

  return content[searchable.model] ?? [];
}

function groupResults(
  searchables: Searchable[],
  match: (searchable: Searchable) => SearchResult[],
): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];

  searchables.forEach((searchable) => {
    const options = sortSearchResultsByStatus(match(searchable), searchable.model).slice(
      0,
      RESULT_LIMIT,
    );

    if (options.length > 0) {
      groups.push({ groupName: searchable.name, groupKey: searchable.key, options });
    }
  });

  return groups;
}

/** Matches word prefixes in any order, ranked by FlexSearch. */
export function createFlexSearchProvider(
  searchables: Searchable[],
  content: SearchContent,
): SearchProvider {
  const indexes = new Map(
    searchables.map((searchable) => {
      const index = new FlexSearch.Document<SearchItem, true>({
        tokenize: 'forward',
        document: { id: 'id', index: searchable.index, store: true },
      });
      itemsFor(searchable, content).forEach((item) => index.add(item));
      return [searchable.model, index] as const;
    }),
  );

  return {
    search(term) {
      return groupResults(searchables, (searchable) => {
        const seen = new Set<string>();
        const results: SearchResult[] = [];

        indexes
          .get(searchable.model)
          ?.search<true>(term, RESULT_LIMIT, { enrich: true })
          .forEach((field) => {
            field.result.forEach(({ doc }) => {
              if (seen.has(doc.id)) {
                return;
              }

              seen.add(doc.id);
              results.push(createSearchResult(searchable, doc));
            });
          });

        return results;
      });
    },
  };
}

/** Matches the term as a case-insensitive substring, in content order. */
export function createBasicSearchProvider(
  searchables: Searchable[],
  content: SearchContent,
): SearchProvider {
  const resultsByModel = new Map(
    searchables.map((searchable) => [
      searchable.model,
      itemsFor(searchable, content).map((item) => createSearchResult(searchable, item)),
    ]),
  );

  return {
    search(term) {
      if (!term.trim()) {
        return [];
      }

      const needle = term.toLowerCase();

      return groupResults(searchables, (searchable) => {
        const keywordsIndexed = searchable.index.includes('keywords');

        return (resultsByModel.get(searchable.model) ?? []).filter(
          (result) =>
            result.title.toLowerCase().includes(needle) ||
            (keywordsIndexed && Boolean(result.keywords?.toLowerCase().includes(needle))),
        );
      });
    },
  };
}

/** FlexSearch's word tokenizer only suits English; substring matching works for any language. */
export function createSearchProvider(
  searchables: Searchable[],
  locale: string | null | undefined,
  content: SearchContent,
): SearchProvider {
  const isEnglish = locale?.toLowerCase().startsWith('en') ?? true;

  return isEnglish
    ? createFlexSearchProvider(searchables, content)
    : createBasicSearchProvider(searchables, content);
}
