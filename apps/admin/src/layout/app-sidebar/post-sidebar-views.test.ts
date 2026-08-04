import {describe, expect, it} from 'vitest';
import {
    POST_DEFAULT_VIEWS,
    buildPostViewUrl,
    getDefaultPostViews,
    isPostViewActive
} from './post-sidebar-views';

// Saved views are addressed by the same five params the list screen uses, and
// Ember compares them for exact equality after dropping nulls. Getting this
// wrong means the sidebar highlights the wrong thing, or nothing.

describe('buildPostViewUrl', () => {
    it('builds a bare route URL for an empty filter', () => {
        expect(buildPostViewUrl('posts', {})).toBe('posts');
    });

    it('includes the params that are set', () => {
        expect(buildPostViewUrl('posts', {type: 'draft'})).toBe('posts?type=draft');
    });

    it('drops nulls rather than emitting empty params', () => {
        expect(buildPostViewUrl('posts', {type: 'draft', tag: null, author: null}))
            .toBe('posts?type=draft');
    });

    // Stable order regardless of the record's key order, so the same view
    // always produces the same URL.
    it('orders params consistently', () => {
        const fromOneOrder = buildPostViewUrl('posts', {tag: 'news', type: 'draft'});
        const fromAnother = buildPostViewUrl('posts', {type: 'draft', tag: 'news'});

        expect(fromOneOrder).toBe(fromAnother);
        expect(fromOneOrder).toBe('posts?type=draft&tag=news');
    });

    it('builds pages URLs too', () => {
        expect(buildPostViewUrl('pages', {type: 'draft'})).toBe('pages?type=draft');
    });
});

describe('isPostViewActive', () => {
    const at = (search: string) => ({pathname: '/posts', search});

    it('matches when every param agrees', () => {
        expect(isPostViewActive(at('?type=draft'), 'posts', {type: 'draft'})).toBe(true);
    });

    it('does not match a different route', () => {
        expect(isPostViewActive({pathname: '/pages', search: '?type=draft'}, 'posts', {type: 'draft'}))
            .toBe(false);
    });

    // Ember compares the whole param set, so a view is not active merely
    // because the URL is a superset of it.
    it('does not match when the URL carries an extra param', () => {
        expect(isPostViewActive(at('?type=draft&tag=news'), 'posts', {type: 'draft'})).toBe(false);
    });

    it('does not match when the URL is missing one of the view params', () => {
        expect(isPostViewActive(at('?type=draft'), 'posts', {type: 'draft', tag: 'news'})).toBe(false);
    });

    it('treats a null in the view as absent from the URL', () => {
        expect(isPostViewActive(at('?type=draft'), 'posts', {type: 'draft', tag: null})).toBe(true);
    });

    it('matches an empty view against a bare URL', () => {
        expect(isPostViewActive(at(''), 'posts', {})).toBe(true);
        expect(isPostViewActive(at('?type=draft'), 'posts', {})).toBe(false);
    });

    // Sort is part of a view's identity in Ember - it is one of the five
    // params `reset-query-params` covers.
    it('includes order in the comparison', () => {
        expect(isPostViewActive(at('?type=draft'), 'posts', {type: 'draft', order: 'published_at asc'}))
            .toBe(false);
        expect(isPostViewActive(at('?type=draft&order=published_at+asc'), 'posts', {
            type: 'draft', order: 'published_at asc'
        })).toBe(true);
    });

    it('ignores params that are not part of a view', () => {
        expect(isPostViewActive(at('?type=draft&somethingElse=x'), 'posts', {type: 'draft'})).toBe(true);
    });
});

describe('getDefaultPostViews', () => {
    it('offers Drafts, Scheduled and Published, in that order', () => {
        expect(getDefaultPostViews(false).map(view => view.name))
            .toEqual(['Drafts', 'Scheduled', 'Published']);
    });

    it('matches the Ember filters exactly', () => {
        expect(POST_DEFAULT_VIEWS.map(view => view.filter))
            .toEqual([{type: 'draft'}, {type: 'scheduled'}, {type: 'published'}]);
    });

    // Contributors only ever see their own drafts, so status views are
    // meaningless to them - Ember hides them.
    it('offers none to a contributor', () => {
        expect(getDefaultPostViews(true)).toEqual([]);
    });
});
