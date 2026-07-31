export const BILLING_SEARCH_GROUP_KEY = 'billing';

export const SEARCHABLES = [
    {
        name: 'Staff',
        model: 'user',
        pathField: 'slug',
        idField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: 'Tags',
        model: 'tag',
        pathField: 'slug',
        idField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        key: BILLING_SEARCH_GROUP_KEY,
        model: 'pro-page',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title', 'keywords'],
        // the billing group is defined entirely in config: it only resolves
        // when hostSettings.billing.search provides a groupName and at least
        // one valid item — an id, a title, and a path within the host's own
        // billing app (eg. '/plans'). Anything else is dropped
        configure(hostSettings) {
            const searchConfig = hostSettings?.billing?.search;

            const groupName = typeof searchConfig?.groupName === 'string' ? searchConfig.groupName.trim() : '';
            const staticItems = Array.isArray(searchConfig?.items)
                ? searchConfig.items
                    .filter(item => (
                        typeof item?.id === 'string' && item.id
                        && typeof item.title === 'string' && item.title
                        && typeof item.path === 'string' && item.path.startsWith('/')
                    ))
                    .map(item => ({
                        id: item.id,
                        title: item.title,
                        path: item.path,
                        keywords: typeof item.keywords === 'string' ? item.keywords : ''
                    }))
                : [];

            if (!groupName || staticItems.length === 0) {
                return null;
            }

            const searchable = {...this, name: groupName, staticItems};
            delete searchable.configure;

            return searchable;
        }
    },
    {
        name: 'Posts',
        model: 'post',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title']
    },
    {
        name: 'Pages',
        model: 'page',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title']
    }
];

export function getSearchables(hostSettings) {
    return SEARCHABLES
        .map(searchable => (searchable.configure ? searchable.configure(hostSettings) : searchable))
        .filter(Boolean);
}

const STATUS_PRIORITY = {
    scheduled: 1,
    draft: 2,
    published: 3,
    sent: 4
};

export function sortSearchResultsByStatus(results, model) {
    if (model === 'post' || model === 'page') {
        results.sort((a, b) => {
            const aPriority = STATUS_PRIORITY[a.status] || 5;
            const bPriority = STATUS_PRIORITY[b.status] || 5;
            return aPriority - bPriority;
        });
    }
    return results;
}

export function createSearchResult(searchable, item) {
    const idField = searchable.idField || searchable.pathField;

    return {
        id: `${searchable.model}.${item[idField]}`,
        url: item.url,
        path: item.path,
        title: item[searchable.titleField],
        keywords: item.keywords,
        groupName: searchable.name,
        groupKey: searchable.key,
        status: item.status,
        visibility: item.visibility,
        publishedAt: item.published_at
    };
}
