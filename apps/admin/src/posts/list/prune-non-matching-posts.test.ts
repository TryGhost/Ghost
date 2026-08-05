import {describe, expect, it} from 'vitest';
import {pruneNonMatchingPosts} from './prune-non-matching-posts';
import type {PostListItem} from './hooks/use-posts-list';

/**
 * After a bulk edit, Ember re-runs NQL *in the browser* against the list's own
 * filter and drops the rows that no longer match — that is why unfeaturing a
 * post while viewing `?type=featured` makes it disappear immediately, without a
 * refetch and without losing scroll position.
 *
 * Ported from `updateFilteredPosts` in
 * `apps/ember-admin/app/components/posts-list/context-menu.js`.
 */

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
    id: 'p1', uuid: 'u1', url: 'u', slug: 'p', title: 'A post', status: 'draft', ...overrides
});

describe('pruneNonMatchingPosts', () => {
    // The first rule, and the one with the worst failure mode: a row the user
    // never touched must survive, whatever the filter says about it. Otherwise
    // a bulk edit silently empties rows the action had nothing to do with.
    it('never removes a post that was not edited', () => {
        const untouched = post({id: 'other', featured: false});

        const remaining = pruneNonMatchingPosts({
            posts: [untouched],
            editedIds: new Set(['p1']),
            filter: 'featured:true'
        });

        expect(remaining).toEqual([untouched]);
    });

    // The behaviour the whole module exists for: unfeature a post while viewing
    // `?type=featured` and it leaves the list immediately.
    it('removes an edited post that no longer matches the filter', () => {
        const remaining = pruneNonMatchingPosts({
            posts: [post({id: 'p1', featured: false})],
            editedIds: new Set(['p1']),
            filter: 'featured:true'
        });

        expect(remaining).toEqual([]);
    });

    it('keeps an edited post that still matches', () => {
        const stillFeatured = post({id: 'p1', featured: true});

        const remaining = pruneNonMatchingPosts({
            posts: [stillFeatured],
            editedIds: new Set(['p1']),
            filter: 'featured:true'
        });

        expect(remaining).toEqual([stillFeatured]);
    });

    /**
     * The expansions are not optional. Without them `tag:news` is looked up as
     * a literal `tag` property, which posts do not have — so every edited post
     * fails to match and the whole selection vanishes from the list.
     */
    describe('the expansions', () => {
        const tagged = (slug: string) => post({id: 'p1', tags: [{slug, name: slug}]});

        it('matches a tag filter against the post tags', () => {
            expect(pruneNonMatchingPosts({
                posts: [tagged('news')],
                editedIds: new Set(['p1']),
                filter: 'tag:news'
            })).toHaveLength(1);
        });

        it('removes a post whose tags no longer include the filtered one', () => {
            expect(pruneNonMatchingPosts({
                posts: [tagged('sport')],
                editedIds: new Set(['p1']),
                filter: 'tag:news'
            })).toHaveLength(0);
        });

        it('matches an author filter against the post authors', () => {
            const authored = post({id: 'p1', authors: [{slug: 'ada', name: 'Ada'}]});

            expect(pruneNonMatchingPosts({
                posts: [authored],
                editedIds: new Set(['p1']),
                filter: 'authors:ada'
            })).toHaveLength(1);
        });
    });

    // An unfiltered list bounds nothing, so nothing can fall out of it. NQL
    // would throw on an empty string, which would take the whole action down
    // after the server had already applied it.
    it('keeps everything when the list has no filter', () => {
        const posts = [post({id: 'p1'}), post({id: 'p2'})];

        expect(pruneNonMatchingPosts({
            posts,
            editedIds: new Set(['p1', 'p2']),
            filter: ''
        })).toEqual(posts);
    });

    // The analytics endpoints don't return relations, so a row can reach the
    // pruner without `tags` at all. Throwing here would lose the list.
    it('treats a post with no tags as not matching a tag filter', () => {
        expect(pruneNonMatchingPosts({
            posts: [post({id: 'p1'})],
            editedIds: new Set(['p1']),
            filter: 'tag:news'
        })).toHaveLength(0);
    });

    // A filter NQL cannot parse must not take the list with it: the edit has
    // already happened server-side by this point.
    it('keeps everything when the filter cannot be parsed', () => {
        const posts = [post({id: 'p1'})];

        expect(pruneNonMatchingPosts({
            posts,
            editedIds: new Set(['p1']),
            filter: 'status:'
        })).toEqual(posts);
    });
});
