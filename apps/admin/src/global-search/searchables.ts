import { z } from 'zod';

export const BILLING_SEARCH_GROUP_KEY = 'billing';

export type SearchableModel = 'user' | 'tag' | 'pro-page' | 'post' | 'page';

const searchIndexItemSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
});

/** An entry from a `search-index/*` endpoint. */
export type SearchIndexItem = z.output<typeof searchIndexItemSchema>;

/** A search-index entry, or a configured billing item. */
export type SearchItem = SearchIndexItem & { path?: string; keywords?: string };

function parseEach<T>(schema: z.ZodType<T>, items: unknown[]): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Keeps the entries of a `search-index/*` response that match the expected shape. */
export function parseSearchIndexItems(items: unknown): SearchIndexItem[] {
  return Array.isArray(items) ? parseEach(searchIndexItemSchema, items) : [];
}

export interface Searchable {
  name: string;
  key?: string;
  model: SearchableModel;
  idField: 'id' | 'slug';
  titleField: 'name' | 'title';
  index: Array<'name' | 'title' | 'keywords'>;
  staticItems?: SearchItem[];
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

  const staticItems = parseEach(billingSearchItemSchema, config.data.items);

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

export function createSearchResult(searchable: Searchable, item: SearchItem): SearchResult {
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
