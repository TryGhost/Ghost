import { Document, Encoder, type Id } from 'flexsearch';
import {
  type SearchIndexItem,
  type SearchResult,
  type SearchResultGroup,
  type Searchable,
  type SearchableModel,
  createSearchResult,
  sortSearchResultsByStatus,
} from './searchables';

export interface SearchProvider {
  /** Replaces the searchable content for a model. Configured static items can't be replaced. */
  setContent(model: SearchableModel, items: SearchIndexItem[]): void;
  search(term: string): SearchResultGroup[];
}

function groupResults(
  searchables: Searchable[],
  match: (searchable: Searchable) => SearchResult[],
): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];

  searchables.forEach((searchable) => {
    const options = sortSearchResultsByStatus(match(searchable), searchable.model);

    if (options.length > 0) {
      groups.push({ groupName: searchable.name, groupKey: searchable.key, options });
    }
  });

  return groups;
}

// FlexSearch 0.8's default encoder also folds diacritics and collapses repeated
// letters, so "aa" would match every word starting with "a"
const encoder = new Encoder({ normalize: (text) => text.toLowerCase(), dedupe: false });

/** Matches word prefixes in any order, ranked by FlexSearch. */
export function createFlexSearchProvider(searchables: Searchable[]): SearchProvider {
  const indexes = new Map<SearchableModel, Document<SearchIndexItem>>();

  const buildIndex = (searchable: Searchable, items: SearchIndexItem[]) => {
    const index = new Document<SearchIndexItem>({
      tokenize: 'forward',
      encoder,
      document: { id: 'id', index: searchable.index, store: true },
    });
    items.forEach((item) => index.add(item));
    indexes.set(searchable.model, index);
  };

  searchables.forEach((searchable) => buildIndex(searchable, searchable.staticItems ?? []));

  return {
    setContent(model, items) {
      const searchable = searchables.find((candidate) => candidate.model === model);

      if (searchable && !searchable.staticItems) {
        buildIndex(searchable, items);
      }
    },

    search(term) {
      if (!term.trim()) {
        return [];
      }

      return groupResults(searchables, (searchable) => {
        const seen = new Set<Id>();
        const results: SearchResult[] = [];

        indexes
          .get(searchable.model)
          ?.search(term, { enrich: true })
          .forEach((field) => {
            field.result.forEach(({ id, doc }) => {
              if (!doc || seen.has(id)) {
                return;
              }

              seen.add(id);
              results.push(createSearchResult(searchable, doc));
            });
          });

        return results;
      });
    },
  };
}

/** Matches the term as a case-insensitive substring, in content order. */
export function createBasicSearchProvider(searchables: Searchable[]): SearchProvider {
  const content = new Map<SearchableModel, SearchResult[]>();

  searchables.forEach((searchable) => {
    content.set(
      searchable.model,
      (searchable.staticItems ?? []).map((item) => createSearchResult(searchable, item)),
    );
  });

  return {
    setContent(model, items) {
      const searchable = searchables.find((candidate) => candidate.model === model);

      if (searchable && !searchable.staticItems) {
        content.set(
          model,
          items.map((item) => createSearchResult(searchable, item)),
        );
      }
    },

    search(term) {
      if (!term.trim()) {
        return [];
      }

      const needle = term.toLowerCase();

      return groupResults(searchables, (searchable) => {
        const keywordsIndexed = searchable.index.includes('keywords');

        return (content.get(searchable.model) ?? []).filter(
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
): SearchProvider {
  const isEnglish = locale?.toLowerCase().startsWith('en') ?? true;

  return isEnglish ? createFlexSearchProvider(searchables) : createBasicSearchProvider(searchables);
}
