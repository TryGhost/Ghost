import {describe, expect, it} from 'vitest';
import {getPostContextMenuItems, type PostContextMenuInputs} from './post-context-menu-items';
import type {PostListItem} from './hooks/use-posts-list';

/**
 * Which items the right-click menu shows, ported from the template and the five
 * predicates in `apps/ember-admin/app/components/posts-list/context-menu.js`.
 *
 * The rule that makes this worth its own module: the menu describes the **whole
 * selection**, not the row that was right-clicked. Ember's predicates all loop
 * over every selected model, and most of them are "any" rather than "every" —
 * so one published post among five drafts is enough to offer Unpublish.
 */

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
    id: 'p1', uuid: 'u1', url: 'https://example.com/p', slug: 'p', title: 'A post', status: 'draft', ...overrides
});

const inputs = (
    posts: PostListItem[],
    overrides: Partial<PostContextMenuInputs> = {}
): PostContextMenuInputs => ({
    posts,
    resource: 'posts',
    isAdmin: true,
    membersEnabled: true,
    canCopyGiftLink: false,
    ...overrides
});

const keys = (input: PostContextMenuInputs) => getPostContextMenuItems(input).map(item => item.key);

describe('getPostContextMenuItems', () => {
    describe('for a single draft', () => {
        it('offers the preview link, not the public link', () => {
            const items = keys(inputs([post({status: 'draft'})]));

            expect(items).toContain('copy-preview');
            expect(items).not.toContain('copy-link');
        });

        it('offers no unpublish or unschedule', () => {
            const items = keys(inputs([post({status: 'draft'})]));

            expect(items).not.toContain('unpublish');
            expect(items).not.toContain('unschedule');
        });
    });

    describe('for a single published post', () => {
        it('offers the public link and unpublish', () => {
            const items = keys(inputs([post({status: 'published'})]));

            expect(items).toContain('copy-link');
            expect(items).toContain('unpublish');
        });

        // The template nests the preview link in the `else` of `canUnpublish`,
        // so a published post never offers both.
        it('does not also offer the preview link', () => {
            expect(keys(inputs([post({status: 'published'})]))).not.toContain('copy-preview');
        });
    });

    it('offers unschedule for a scheduled post', () => {
        const items = keys(inputs([post({status: 'scheduled'})]));

        expect(items).toContain('unschedule');
        expect(items).toContain('copy-preview');
    });

    describe('across a mixed selection', () => {
        // Every status predicate is "any", not "every".
        it('offers unpublish when only one of several is published', () => {
            const items = keys(inputs([
                post({id: 'a', status: 'draft'}),
                post({id: 'b', status: 'draft'}),
                post({id: 'c', status: 'published'})
            ]));

            expect(items).toContain('unpublish');
        });

        it('offers unschedule when a scheduled post sits among drafts', () => {
            const items = keys(inputs([
                post({id: 'a', status: 'draft'}),
                post({id: 'b', status: 'scheduled'})
            ]));

            expect(items).toContain('unschedule');
        });

        // `canCopySelection` is length === 1 — these are single-post actions.
        it('drops the per-post actions once more than one row is selected', () => {
            const items = keys(inputs([
                post({id: 'a', status: 'published'}),
                post({id: 'b', status: 'published'})
            ]));

            expect(items).not.toContain('copy-link');
            expect(items).not.toContain('copy-preview');
            expect(items).not.toContain('duplicate');
        });
    });

    describe('feature and unfeature', () => {
        // The flip is `featured <= length / 2` — the menu offers whichever
        // action would affect the majority.
        it('offers Feature when none are featured', () => {
            expect(keys(inputs([post({featured: false})]))).toContain('feature');
        });

        it('offers Unfeature when all are featured', () => {
            expect(keys(inputs([post({featured: true})]))).toContain('unfeature');
        });

        it('offers Feature at exactly half, where the comparison is inclusive', () => {
            const items = keys(inputs([
                post({id: 'a', featured: true}),
                post({id: 'b', featured: false})
            ]));

            expect(items).toContain('feature');
            expect(items).not.toContain('unfeature');
        });

        it('offers Unfeature once featured posts are the majority', () => {
            const items = keys(inputs([
                post({id: 'a', featured: true}),
                post({id: 'b', featured: true}),
                post({id: 'c', featured: false})
            ]));

            expect(items).toContain('unfeature');
        });

        // A sent post can't be featured, so a selection of only sent posts
        // offers neither.
        it('offers neither for a selection of only sent posts', () => {
            const items = keys(inputs([post({status: 'sent'})]));

            expect(items).not.toContain('feature');
            expect(items).not.toContain('unfeature');
        });

        it('still offers them when one non-sent post is in the selection', () => {
            const items = keys(inputs([
                post({id: 'a', status: 'sent'}),
                post({id: 'b', status: 'draft'})
            ]));

            expect(items).toContain('feature');
        });
    });

    describe('role and site configuration', () => {
        it('hides Delete from anyone who is not an admin', () => {
            expect(keys(inputs([post()], {isAdmin: false}))).not.toContain('delete');
        });

        it('offers Delete to an admin', () => {
            expect(keys(inputs([post()]))).toContain('delete');
        });

        it('hides Change access when memberships are off', () => {
            expect(keys(inputs([post()], {membersEnabled: false}))).not.toContain('change-access');
        });

        it('shows the gift link only when the caller says it is eligible', () => {
            const eligible = inputs([post({status: 'published'})], {canCopyGiftLink: true});

            expect(keys(eligible)).toContain('gift-link');
            expect(keys(inputs([post({status: 'published'})]))).not.toContain('gift-link');
        });
    });

    // Add a tag is the only item with no condition at all.
    it('always offers Add a tag', () => {
        expect(keys(inputs([post()], {isAdmin: false, membersEnabled: false}))).toContain('add-tag');
    });

    it('is empty when nothing is selected', () => {
        expect(keys(inputs([]))).toEqual([]);
    });

    it('orders the items as the Ember template does', () => {
        const items = keys(inputs([post({status: 'published', featured: false})], {canCopyGiftLink: true}));

        expect(items).toEqual([
            'copy-link',
            'gift-link',
            'unpublish',
            'feature',
            'add-tag',
            'change-access',
            'duplicate',
            'delete'
        ]);
    });

    // Ember puts a separator above Unpublish only when the gift link is
    // there — and whether it renders is decided per row, after this list is
    // built. The menu draws that rule from adjacency, so Unpublish must not
    // carry a flag that survives the gift link being filtered out.
    it('leaves the gift-link separator to the menu, not the Unpublish item', () => {
        const withGift = getPostContextMenuItems(
            inputs([post({status: 'published'})], {canCopyGiftLink: true})
        );
        const withoutGift = getPostContextMenuItems(inputs([post({status: 'published'})]));

        expect(withGift.find(item => item.key === 'unpublish')?.separated).toBe(false);
        expect(withoutGift.find(item => item.key === 'unpublish')?.separated).toBe(false);
    });

    // Ember hardcodes the noun here, as it does in the matching toast. Ported
    // rather than corrected, so the two implementations read alike.
    it('still says "post" on a page, as Ember does', () => {
        const items = getPostContextMenuItems(inputs([post({status: 'published'})], {resource: 'pages'}));

        expect(items.find(item => item.key === 'copy-link')?.label).toBe('Copy link to post');
    });
});
