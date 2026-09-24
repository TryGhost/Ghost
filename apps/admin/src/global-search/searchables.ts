import { z } from 'zod';

export const BILLING_SEARCH_GROUP_KEY = 'billing';

export type SearchableModel = 'user' | 'tag' | 'pro-page' | 'post' | 'page';

/** An entry from a `search-index/*` endpoint, or a configured billing item. */
export interface SearchIndexItem {
  id: string;
  slug?: string;
  path?: string;
  name?: string;
  title?: string;
  keywords?: string;
  status?: string;
}

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
  path?: string;
  title: string;
  keywords?: string;
  groupName: string;
  groupKey?: string;
  status?: string;
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

/** Host config defines the billing group: `{groupName, items: [{id, title, path, keywords}]}`. */
const billingSearchConfigSchema = z.object({
  // a built-in name would put two groups under one heading
  groupName: z
    .string()
    .trim()
    .min(1)
    .refine((name) => !BUILT_IN_GROUP_NAMES.includes(name)),
  items: z.array(z.unknown()),
});

const billingSearchItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // a billing app route: no query, fragment, whitespace, or trailing slash
  path: z
    .string()
    .regex(/^\/[^?#\s]*$/)
    .refine((path) => path === '/' || !path.endsWith('/')),
  keywords: z.string().catch(''),
});

function getBillingSearchable(searchConfig: unknown): Searchable | null {
  const config = billingSearchConfigSchema.safeParse(searchConfig);

  if (!config.success) {
    return null;
  }

  const staticItems = config.data.items.flatMap((item) => {
    const parsed = billingSearchItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });

  if (staticItems.length === 0) {
    return null;
  }

  return {
    name: config.data.groupName,
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
    path: item.path,
    title: item[searchable.titleField] ?? '',
    keywords: item.keywords,
    groupName: searchable.name,
    groupKey: searchable.key,
    status: item.status,
  };
}
