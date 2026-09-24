export const BILLING_SEARCH_GROUP_KEY = 'billing';

export type SearchableModel = 'user' | 'tag' | 'pro-page' | 'post' | 'page';

/** An entry from a `search-index/*` endpoint, or a configured billing item. */
export type SearchIndexItem = {
  id: string;
  slug?: string;
  url?: string;
  path?: string;
  name?: string;
  title?: string;
  keywords?: string;
  status?: string;
  visibility?: string;
  published_at?: string | null;
};

export interface Searchable {
  name: string;
  key?: string;
  model: SearchableModel;
  idField: 'id' | 'slug';
  titleField: 'name' | 'title';
  index: Array<'name' | 'title' | 'keywords'>;
  staticItems?: SearchIndexItem[];
}

export interface SearchResult {
  id: string;
  url?: string;
  path?: string;
  title: string;
  keywords?: string;
  groupName: string;
  groupKey?: string;
  status?: string;
  visibility?: string;
  publishedAt?: string | null;
}

export interface SearchResultGroup {
  groupName: string;
  groupKey?: string;
  options: SearchResult[];
}

const STAFF: Searchable = {
  name: 'Staff',
  model: 'user',
  idField: 'slug',
  titleField: 'name',
  index: ['name'],
};

const TAGS: Searchable = {
  name: 'Tags',
  model: 'tag',
  idField: 'slug',
  titleField: 'name',
  index: ['name'],
};

const POSTS: Searchable = {
  name: 'Posts',
  model: 'post',
  idField: 'id',
  titleField: 'title',
  index: ['title'],
};

const PAGES: Searchable = {
  name: 'Pages',
  model: 'page',
  idField: 'id',
  titleField: 'title',
  index: ['title'],
};

const BUILT_IN_GROUP_NAMES = [STAFF, TAGS, POSTS, PAGES].map((searchable) => searchable.name);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBillingItem(
  item: unknown,
): item is { id: string; title: string; path: string; keywords?: unknown } {
  return (
    isRecord(item) &&
    typeof item.id === 'string' &&
    item.id !== '' &&
    typeof item.title === 'string' &&
    item.title !== '' &&
    typeof item.path === 'string' &&
    /^\/[^?#\s]*$/.test(item.path) &&
    (item.path === '/' || !item.path.endsWith('/'))
  );
}

/**
 * The billing group is defined entirely by host config, eg.
 * `{groupName: 'Ghost(Pro)', items: [{id, title, path: '/plans', keywords}]}`,
 * where each `path` is a billing app route.
 */
function getBillingSearchable(searchConfig: unknown): Searchable | null {
  if (!isRecord(searchConfig)) {
    return null;
  }

  const groupName = typeof searchConfig.groupName === 'string' ? searchConfig.groupName.trim() : '';
  const staticItems = Array.isArray(searchConfig.items)
    ? searchConfig.items.filter(isBillingItem).map((item) => ({
        id: item.id,
        title: item.title,
        path: item.path,
        keywords: typeof item.keywords === 'string' ? item.keywords : '',
      }))
    : [];

  // a built-in name would cross-match items and route selections to the wrong group
  if (!groupName || BUILT_IN_GROUP_NAMES.includes(groupName) || staticItems.length === 0) {
    return null;
  }

  return {
    name: groupName,
    key: BILLING_SEARCH_GROUP_KEY,
    model: 'pro-page',
    idField: 'id',
    titleField: 'title',
    index: ['title', 'keywords'],
    staticItems,
  };
}

export function getSearchables(hostSettings?: { billing?: { search?: unknown } }): Searchable[] {
  const billing = getBillingSearchable(hostSettings?.billing?.search);

  return billing ? [STAFF, TAGS, billing, POSTS, PAGES] : [STAFF, TAGS, POSTS, PAGES];
}

const STATUS_PRIORITY: Record<string, number> = {
  scheduled: 1,
  draft: 2,
  published: 3,
  sent: 4,
};

export function sortSearchResultsByStatus(
  results: SearchResult[],
  model: SearchableModel,
): SearchResult[] {
  if (model !== 'post' && model !== 'page') {
    return results;
  }

  const priority = (result: SearchResult) => STATUS_PRIORITY[result.status ?? ''] ?? 5;
  return [...results].sort((a, b) => priority(a) - priority(b));
}

export function createSearchResult(searchable: Searchable, item: SearchIndexItem): SearchResult {
  return {
    id: `${searchable.model}.${item[searchable.idField]}`,
    url: item.url,
    path: item.path,
    title: item[searchable.titleField] ?? '',
    keywords: item.keywords,
    groupName: searchable.name,
    groupKey: searchable.key,
    status: item.status,
    visibility: item.visibility,
    publishedAt: item.published_at,
  };
}
