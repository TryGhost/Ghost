import {describe, expect, it} from 'vitest';
import {getPostsListQueries, parsePostsListParams} from './posts-query-params';

describe('parsePostsListParams', () => {
    it('parses valid params', () => {
        const params = parsePostsListParams(
            new URLSearchParams('type=draft&visibility=[paid,tiers]&author=cameron&tag=news&order=published_at asc'),
            'posts'
        );

        expect(params).toEqual({
            type: 'draft',
            visibility: '[paid,tiers]',
            author: 'cameron',
            tag: 'news',
            order: 'published_at asc'
        });
    });

    it('ignores invalid type, visibility and order values', () => {
        const params = parsePostsListParams(new URLSearchParams('type=banana&visibility=nope&order=title asc'), 'posts');

        expect(params.type).toBe(null);
        expect(params.visibility).toBe(null);
        expect(params.order).toBe(null);
    });

    it('does not allow the sent type for pages', () => {
        expect(parsePostsListParams(new URLSearchParams('type=sent'), 'pages').type).toBe(null);
        expect(parsePostsListParams(new URLSearchParams('type=sent'), 'posts').type).toBe('sent');
    });
});

describe('getPostsListQueries', () => {
    const defaultParams = {type: null, visibility: null, author: null, tag: null, order: null} as const;

    it('builds the three default sections for posts', () => {
        const {sections, allFilter} = getPostsListQueries({params: {...defaultParams}, resource: 'posts'});

        expect(sections.scheduled).toEqual({filter: 'status:scheduled', order: 'published_at desc'});
        expect(sections.drafts).toEqual({filter: 'status:draft', order: 'updated_at desc'});
        expect(sections.published).toEqual({filter: 'status:[published,sent]', order: 'published_at desc'});
        expect(allFilter).toBe('status:[draft,scheduled,published,sent]');
    });

    it('excludes sent for pages', () => {
        const {sections, allFilter} = getPostsListQueries({params: {...defaultParams}, resource: 'pages'});

        expect(sections.published).toEqual({filter: 'status:published', order: 'published_at desc'});
        expect(allFilter).toBe('status:[draft,scheduled,published]');
    });

    it('narrows to a single section when type is set', () => {
        const {sections, allFilter} = getPostsListQueries({params: {...defaultParams, type: 'draft'}, resource: 'posts'});

        expect(sections.scheduled).toBeUndefined();
        expect(sections.published).toBeUndefined();
        expect(sections.drafts).toEqual({filter: 'status:draft', order: 'updated_at desc'});
        expect(allFilter).toBe('status:draft');
    });

    it('runs a single featured query across all statuses', () => {
        const {sections, allFilter} = getPostsListQueries({params: {...defaultParams, type: 'featured'}, resource: 'posts'});

        expect(Object.keys(sections)).toEqual(['published']);
        expect(sections.published).toEqual({
            filter: 'status:[draft,scheduled,published,sent]+featured:true',
            order: 'published_at desc'
        });
        expect(allFilter).toBe('status:[draft,scheduled,published,sent]+featured:true');
    });

    it('combines visibility, author and tag filters with +', () => {
        const {sections} = getPostsListQueries({
            params: {...defaultParams, visibility: '[paid,tiers]', author: 'cameron', tag: 'news'},
            resource: 'posts'
        });

        expect(sections.drafts?.filter).toBe('status:draft+visibility:[paid,tiers]+authors:cameron+tag:news');
    });

    it('forces the author slug for authors and contributors', () => {
        const {sections} = getPostsListQueries({
            params: {...defaultParams, author: 'someone-else'},
            resource: 'posts',
            forcedAuthorSlug: 'me'
        });

        expect(sections.drafts?.filter).toBe('status:draft+authors:me');
    });

    it('applies the order param to every section', () => {
        const {sections} = getPostsListQueries({
            params: {...defaultParams, order: 'published_at asc'},
            resource: 'posts'
        });

        expect(sections.scheduled?.order).toBe('published_at asc');
        expect(sections.drafts?.order).toBe('published_at asc');
        expect(sections.published?.order).toBe('published_at asc');
    });
});
