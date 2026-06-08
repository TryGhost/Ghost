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
        title: item[searchable.titleField],
        groupName: searchable.name,
        status: item.status,
        visibility: item.visibility,
        publishedAt: item.published_at
    };
}