import {pluralize} from 'ember-inflector';

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
    },
    {
        name: 'Settings',
        model: 'setting',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title', 'keywords']
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
        path: item.path,
        title: item[searchable.titleField],
        groupName: searchable.name,
        status: item.status,
        visibility: item.visibility,
        publishedAt: item.published_at
    };
}

/**
 * Process response data from search-index endpoints
 * Handles special cases like settings which have a different structure
 */
export function processSearchableResponse(searchable, response) {
    // Special handling for settings which returns settings array
    if (searchable.model === 'setting') {
        const settings = response.settings || response.data;
        if (settings && Array.isArray(settings)) {
            return settings.map((item) => {
                // For settings, we need to prepare both title and keywords
                return {
                    id: item.id,
                    url: item.url,
                    path: item.path,
                    title: item.title,
                    section: item.section,
                    keywords: item.keywords ? item.keywords.join(' ') : ''
                };
            });
        }
        return [];
    }

    // Default handling for other models
    const items = response[pluralize(searchable.model)];
    return items || [];
}

