import {
    DEFAULT_POSTS_VIEWS,
    type PostsView,
    buildPostsViewsForDelete,
    buildPostsViewsForSave,
    cleanViewFilter,
    findMatchingView,
    hasPostsViewNameConflict,
    isPostsViewFilterEqual,
    paramsToViewFilter,
    parsePostsViewsJSON
} from './posts-views';
import {describe, expect, it} from 'vitest';
import type {PostsListParams} from './posts-query-params';

const emptyParams: PostsListParams = {type: null, visibility: null, author: null, tag: null, order: null};

function makeView(overrides: Partial<PostsView> = {}): PostsView {
    return {
        name: 'Featured Drafts',
        route: 'posts',
        color: 'blue',
        filter: {type: 'draft', tag: 'featured'},
        ...overrides
    };
}

describe('paramsToViewFilter', () => {
    it('only includes set params', () => {
        expect(paramsToViewFilter({...emptyParams, type: 'draft', tag: 'news'})).toEqual({type: 'draft', tag: 'news'});
        expect(paramsToViewFilter(emptyParams)).toEqual({});
    });

    it('includes visibility, author and order', () => {
        expect(paramsToViewFilter({
            type: 'published',
            visibility: '[paid,tiers]',
            author: 'cameron',
            tag: 'news',
            order: 'published_at asc'
        })).toEqual({
            type: 'published',
            visibility: '[paid,tiers]',
            author: 'cameron',
            tag: 'news',
            order: 'published_at asc'
        });
    });
});

describe('cleanViewFilter', () => {
    it('drops null, undefined and empty values', () => {
        expect(cleanViewFilter({type: 'draft', tag: null, author: ''})).toEqual({type: 'draft'});
    });
});

describe('isPostsViewFilterEqual', () => {
    it('matches identical filters regardless of key order', () => {
        expect(isPostsViewFilterEqual({type: 'draft', tag: 'news'}, {tag: 'news', type: 'draft'})).toBe(true);
    });

    it('ignores null values when comparing', () => {
        expect(isPostsViewFilterEqual({type: 'draft', tag: null}, {type: 'draft'})).toBe(true);
    });

    it('rejects subsets and different values', () => {
        expect(isPostsViewFilterEqual({type: 'draft', tag: 'news'}, {type: 'draft'})).toBe(false);
        expect(isPostsViewFilterEqual({type: 'draft'}, {type: 'published'})).toBe(false);
    });
});

describe('findMatchingView', () => {
    it('matches default views by type', () => {
        const drafts = findMatchingView(DEFAULT_POSTS_VIEWS, 'posts', {...emptyParams, type: 'draft'});
        expect(drafts?.name).toBe('Drafts');
        expect(drafts?.isDefault).toBe(true);

        expect(findMatchingView(DEFAULT_POSTS_VIEWS, 'posts', {...emptyParams, type: 'scheduled'})?.name).toBe('Scheduled');
        expect(findMatchingView(DEFAULT_POSTS_VIEWS, 'posts', {...emptyParams, type: 'published'})?.name).toBe('Published');
    });

    it('returns null when no params are set', () => {
        expect(findMatchingView(DEFAULT_POSTS_VIEWS, 'posts', emptyParams)).toBe(null);
    });

    it('requires an exact params match, not a subset', () => {
        const views = [...DEFAULT_POSTS_VIEWS, makeView()];

        // type=draft alone matches the default Drafts view, not the saved one
        expect(findMatchingView(views, 'posts', {...emptyParams, type: 'draft'})?.name).toBe('Drafts');
        // type=draft + tag=featured matches the saved view
        expect(findMatchingView(views, 'posts', {...emptyParams, type: 'draft', tag: 'featured'})?.name).toBe('Featured Drafts');
        // extra params mean no match
        expect(findMatchingView(views, 'posts', {...emptyParams, type: 'draft', tag: 'featured', author: 'cameron'})).toBe(null);
    });

    it('only matches views for the requested route', () => {
        const pagesView = makeView({route: 'pages', name: 'Draft Pages', filter: {type: 'draft'}});
        expect(findMatchingView([pagesView], 'posts', {...emptyParams, type: 'draft'})).toBe(null);
        expect(findMatchingView([pagesView], 'pages', {...emptyParams, type: 'draft'})?.name).toBe('Draft Pages');
    });

    it('ignores stored null filter values when matching', () => {
        const view = makeView({filter: {type: 'draft', tag: 'featured', author: null}});
        expect(findMatchingView([view], 'posts', {...emptyParams, type: 'draft', tag: 'featured'})).toBe(view);
    });
});

describe('parsePostsViewsJSON', () => {
    it('returns views for the requested route only', () => {
        const json = JSON.stringify([
            {name: 'My Drafts', route: 'posts', color: 'blue', filter: {type: 'draft'}},
            {name: 'Draft Pages', route: 'pages', color: 'green', filter: {type: 'draft'}},
            {name: 'Paid members', route: 'members', filter: {filter: 'status:paid'}}
        ]);

        const posts = parsePostsViewsJSON(json, 'posts');
        expect(posts).toEqual({ok: true, views: [{name: 'My Drafts', route: 'posts', color: 'blue', filter: {type: 'draft'}}]});

        const pages = parsePostsViewsJSON(json, 'pages');
        expect(pages.ok && pages.views.map(view => view.name)).toEqual(['Draft Pages']);
    });

    it('fails on invalid JSON', () => {
        expect(parsePostsViewsJSON('{not json', 'posts').ok).toBe(false);
    });
});

describe('hasPostsViewNameConflict', () => {
    const views = [...DEFAULT_POSTS_VIEWS, makeView()];

    it('conflicts when the same route reuses a name with a different filter', () => {
        expect(hasPostsViewNameConflict(views, {route: 'posts', name: 'Featured Drafts', filter: {type: 'published'}})).toBe(true);
        // names are compared trimmed and case-insensitively
        expect(hasPostsViewNameConflict(views, {route: 'posts', name: '  featured drafts ', filter: {type: 'published'}})).toBe(true);
    });

    it('conflicts with default view names', () => {
        expect(hasPostsViewNameConflict(views, {route: 'posts', name: 'Drafts', filter: {type: 'published'}})).toBe(true);
    });

    it('does not conflict with itself (same filter)', () => {
        expect(hasPostsViewNameConflict(views, {route: 'posts', name: 'Featured Drafts', filter: {type: 'draft', tag: 'featured'}})).toBe(false);
    });

    it('does not conflict across routes', () => {
        expect(hasPostsViewNameConflict(views, {route: 'pages', name: 'Featured Drafts', filter: {type: 'published'}})).toBe(false);
    });
});

describe('buildPostsViewsForSave', () => {
    const membersView = {name: 'Paid', route: 'members', filter: {filter: 'status:paid'}};

    it('appends a new view and preserves other routes', () => {
        const next = buildPostsViewsForSave([membersView], {name: 'My Drafts', route: 'posts', color: 'blue', filter: {type: 'draft', tag: 'news'}});

        expect(next).toEqual([
            membersView,
            {name: 'My Drafts', route: 'posts', color: 'blue', filter: {type: 'draft', tag: 'news'}}
        ]);
    });

    it('replaces an existing view with the same route and filter (edit)', () => {
        const existing = {name: 'Old Name', route: 'posts', color: 'blue', filter: {type: 'draft', tag: 'news'}};
        const next = buildPostsViewsForSave([membersView, existing], {name: 'New Name', route: 'posts', color: 'red', filter: {type: 'draft', tag: 'news'}});

        expect(next).toEqual([
            membersView,
            {name: 'New Name', route: 'posts', color: 'red', filter: {type: 'draft', tag: 'news'}}
        ]);
    });

    it('does not replace a same-filter view on a different route', () => {
        const pagesView = {name: 'Draft Pages', route: 'pages', filter: {type: 'draft'}};
        const next = buildPostsViewsForSave([pagesView], {name: 'My Drafts', route: 'posts', color: 'blue', filter: {type: 'draft'}});

        expect(next).toHaveLength(2);
    });

    it('trims the view name', () => {
        const next = buildPostsViewsForSave([], {name: '  My Drafts  ', route: 'posts', color: 'blue', filter: {type: 'draft'}});
        expect(next[0].name).toBe('My Drafts');
    });
});

describe('buildPostsViewsForDelete', () => {
    const membersView = {name: 'Paid', route: 'members', filter: {filter: 'status:paid'}};
    const postsView = {name: 'My Drafts', route: 'posts', color: 'blue', filter: {type: 'draft', tag: 'news'}};

    it('removes the matching view and preserves the rest', () => {
        const next = buildPostsViewsForDelete([membersView, postsView], makeView({name: 'My Drafts', filter: {type: 'draft', tag: 'news'}}));
        expect(next).toEqual([membersView]);
    });

    it('throws when the view cannot be found', () => {
        expect(() => buildPostsViewsForDelete([membersView], makeView())).toThrow('Saved view could not be found for delete');
    });
});
