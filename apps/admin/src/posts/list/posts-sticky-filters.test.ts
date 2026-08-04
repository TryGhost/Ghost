import {beforeEach, describe, expect, it} from 'vitest';
import {
    clearStickyPostFilters,
    getStickyPostFilterUrl,
    rememberStickyPostFilters
} from './posts-sticky-filters';

// Ported from state-bridge.js `getRouteUrl`. Three rules, in order:
//   1. already on the route -> bare URL ("click again to go home")
//   2. otherwise reuse the last params seen for that route
//   3. unless those match a saved view, or clicking "Posts" would silently
//      drop you into whichever view you had open last

const NO_VIEWS: Array<Record<string, string | null>> = [];

describe('sticky post filters', () => {
    beforeEach(() => {
        clearStickyPostFilters();
    });

    it('links to the bare route when nothing has been remembered', () => {
        expect(getStickyPostFilterUrl('posts', '/members', NO_VIEWS)).toBe('posts');
    });

    it('reuses the last params seen for the route', () => {
        rememberStickyPostFilters('posts', '?tag=news');

        expect(getStickyPostFilterUrl('posts', '/members', NO_VIEWS)).toBe('posts?tag=news');
    });

    // The "click one more time to go home" behaviour.
    it('links to the bare route while already on it', () => {
        rememberStickyPostFilters('posts', '?tag=news');

        expect(getStickyPostFilterUrl('posts', '/posts', NO_VIEWS)).toBe('posts');
    });

    // Otherwise clicking "Posts" would silently take you into "Drafts".
    it('links to the bare route when the remembered params are a saved view', () => {
        rememberStickyPostFilters('posts', '?type=draft');

        expect(getStickyPostFilterUrl('posts', '/members', [{type: 'draft'}])).toBe('posts');
    });

    it('still reuses params that only partly overlap a view', () => {
        rememberStickyPostFilters('posts', '?type=draft&tag=news');

        expect(getStickyPostFilterUrl('posts', '/members', [{type: 'draft'}]))
            .toBe('posts?type=draft&tag=news');
    });

    it('keeps posts and pages apart', () => {
        rememberStickyPostFilters('posts', '?tag=news');

        expect(getStickyPostFilterUrl('pages', '/members', NO_VIEWS)).toBe('pages');
    });

    it('ignores params that are not part of a view', () => {
        rememberStickyPostFilters('posts', '?tag=news&somethingElse=x');

        expect(getStickyPostFilterUrl('posts', '/members', NO_VIEWS)).toBe('posts?tag=news');
    });

    it('forgets a route once its params are cleared', () => {
        rememberStickyPostFilters('posts', '?tag=news');
        rememberStickyPostFilters('posts', '');

        expect(getStickyPostFilterUrl('posts', '/members', NO_VIEWS)).toBe('posts');
    });
});
