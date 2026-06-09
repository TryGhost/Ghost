import {
    type SharedView,
    isSharedViewFilterEqual,
    normalizeSharedViewName,
    parseAllSharedViewsJSON
} from '../members/shared-views';
import type {PostsListParams, PostsResource} from './posts-query-params';

/** Mirrors Ember's VIEW_COLORS in app/services/custom-views.js */
export const POSTS_VIEW_COLORS = [
    'midgrey',
    'blue',
    'green',
    'red',
    'teal',
    'purple',
    'yellow',
    'orange',
    'pink'
];

/** Same hex values the admin sidebar uses for its color indicators */
export const POSTS_VIEW_COLOR_HEX: Record<string, string> = {
    midgrey: '#7C8B9A',
    blue: '#14b8ff',
    green: '#30cf43',
    red: '#f50b23',
    teal: '#4dcddc',
    purple: '#8e42ff',
    yellow: '#ffb41f',
    orange: '#fe8b05',
    pink: '#fb2d8d'
};

export interface PostsView {
    name: string;
    route: PostsResource;
    color?: string;
    icon?: string;
    filter: Record<string, string | null>;
    /** Default views are built-in, not stored in shared_views and not editable */
    isDefault?: boolean;
}

/** Ember parity: built-in views for the posts route (none exist for pages) */
export const DEFAULT_POSTS_VIEWS: PostsView[] = [
    {route: 'posts', name: 'Drafts', color: 'midgrey', icon: 'pen', filter: {type: 'draft'}, isDefault: true},
    {route: 'posts', name: 'Scheduled', color: 'midgrey', icon: 'clock', filter: {type: 'scheduled'}, isDefault: true},
    {route: 'posts', name: 'Published', color: 'midgrey', icon: 'published-post', filter: {type: 'published'}, isDefault: true}
];

export type PostsViewsParseResult =
    | {ok: true; views: PostsView[]}
    | {ok: false; error: Error};

/** The query param keys that make up a posts/pages view filter */
const VIEW_FILTER_KEYS = ['type', 'visibility', 'author', 'tag', 'order'] as const;

/** Converts the parsed list params into the filter record stored in shared_views */
export function paramsToViewFilter(params: PostsListParams): Record<string, string> {
    const filter: Record<string, string> = {};
    for (const key of VIEW_FILTER_KEYS) {
        const value = params[key];
        if (value !== null) {
            filter[key] = value;
        }
    }
    return filter;
}

/** Ember parity (customViews.cleanFilter): drop empty values before comparing */
export function cleanViewFilter(filter: Record<string, string | null>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(filter).filter(([, value]) => value !== null && value !== undefined && value !== '')
    ) as Record<string, string>;
}

export function isPostsViewFilterEqual(filterA: Record<string, string | null>, filterB: Record<string, string | null>): boolean {
    return isSharedViewFilterEqual(cleanViewFilter(filterA), cleanViewFilter(filterB));
}

/**
 * Finds the view whose filter exactly matches the current list params
 * (Ember parity: customViews.findView)
 */
export function findMatchingView(views: PostsView[], resource: PostsResource, params: PostsListParams): PostsView | null {
    const currentFilter = paramsToViewFilter(params);
    return views.find(view => view.route === resource && isPostsViewFilterEqual(view.filter, currentFilter)) ?? null;
}

export function parsePostsViewsJSON(json: string, route: PostsResource): PostsViewsParseResult {
    const parsed = parseAllSharedViewsJSON(json);

    if (!parsed.ok) {
        return parsed;
    }

    return {
        ok: true,
        views: parsed.views
            .filter(view => view.route === route)
            .map(view => ({...view, route}))
    };
}

/**
 * Ember parity: a name conflicts when another view on the same route has the
 * same (trimmed, case-insensitive) name but a different filter. Same filter +
 * same name simply overwrites the existing view.
 */
export function hasPostsViewNameConflict(views: PostsView[], candidate: {route: PostsResource; name: string; filter: Record<string, string | null>}): boolean {
    const normalizedName = normalizeSharedViewName(candidate.name);

    return views.some((view) => {
        return view.route === candidate.route
            && normalizeSharedViewName(view.name) === normalizedName
            && !isPostsViewFilterEqual(view.filter, candidate.filter);
    });
}

const VIEW_DELETE_NOT_FOUND_ERROR = 'Saved view could not be found for delete';

function findMatchingViewIndexes(allViews: SharedView[], route: PostsResource, filter: Record<string, string | null>): number[] {
    return allViews.flatMap((view, index) => {
        return view.route === route && isPostsViewFilterEqual(view.filter, filter) ? [index] : [];
    });
}

/**
 * Builds the next shared_views array (all routes, including members views)
 * with the given view saved. Route+filter combos are unique: an existing view
 * with the same route+filter is replaced (this is how editing works — the
 * filter itself is not editable), otherwise the view is appended.
 */
export function buildPostsViewsForSave(allViews: SharedView[], view: {name: string; route: PostsResource; color?: string; filter: Record<string, string>}): SharedView[] {
    const nextView: SharedView = {
        name: view.name.trim(),
        route: view.route,
        color: view.color,
        filter: view.filter
    };

    const matchingIndexes = findMatchingViewIndexes(allViews, view.route, view.filter);

    if (matchingIndexes.length > 0) {
        const targetIndex = matchingIndexes[0];
        return allViews.map((existingView, index) => {
            return index === targetIndex ? nextView : existingView;
        });
    }

    return [...allViews, nextView];
}

/** Builds the next shared_views array (all routes) with the given view removed */
export function buildPostsViewsForDelete(allViews: SharedView[], view: PostsView): SharedView[] {
    const matchingIndexes = findMatchingViewIndexes(allViews, view.route, view.filter);

    if (matchingIndexes.length === 0) {
        throw new Error(VIEW_DELETE_NOT_FOUND_ERROR);
    }

    const targetIndex = matchingIndexes[0];
    return allViews.filter((_, index) => index !== targetIndex);
}
