import {describe, expect, it} from 'vitest';
import {
    BUCKET_ORDER,
    buildAllFilter,
    buildBucketFilter,
    getActiveBuckets,
    getBucketOrder,
    getBucketSearchParams,
    getStatusesForType
} from './post-query-params';

// Ported from apps/ember-admin/app/routes/posts.js. These strings go straight
// into API filters, and the same builder feeds the inverted "select all" filter
// that bulk delete runs against, so the exact output matters.

describe('getStatusesForType', () => {
    it('returns every status when no type is set', () => {
        expect(getStatusesForType(null)).toEqual(['draft', 'scheduled', 'published', 'sent']);
        expect(getStatusesForType(undefined)).toEqual(['draft', 'scheduled', 'published', 'sent']);
    });

    it.each([
        ['draft', ['draft']],
        ['published', ['published']],
        ['scheduled', ['scheduled']],
        ['sent', ['sent']]
    ])('maps type=%s to its own status', (type, expected) => {
        expect(getStatusesForType(type)).toEqual(expected);
    });

    // `featured` is not a status - it is every status plus featured:true.
    it('treats featured as every status', () => {
        expect(getStatusesForType('featured')).toEqual(['draft', 'scheduled', 'published', 'sent']);
    });

    it('falls back to every status for an unrecognised type', () => {
        expect(getStatusesForType('nonsense')).toEqual(['draft', 'scheduled', 'published', 'sent']);
    });
});

describe('buildAllFilter', () => {
    it('filters by the full status set when nothing else is set', () => {
        expect(buildAllFilter({})).toBe('status:[draft,scheduled,published,sent]');
    });

    it('omits blank params rather than emitting empty clauses', () => {
        expect(buildAllFilter({type: null, visibility: null, author: null, tag: null}))
            .toBe('status:[draft,scheduled,published,sent]');
    });

    // Key order is load-bearing only in that it must stay stable; this locks
    // the order Ember produced so filters compare equal across the two apps.
    it('orders clauses tag, visibility, status, featured, authors', () => {
        expect(buildAllFilter({tag: 'news', visibility: 'paid', type: 'featured', author: 'jo'}))
            .toBe('tag:news+visibility:paid+status:[draft,scheduled,published,sent]+featured:true+authors:jo');
    });

    it('adds featured:true only for type=featured', () => {
        expect(buildAllFilter({type: 'featured'}))
            .toBe('status:[draft,scheduled,published,sent]+featured:true');
        expect(buildAllFilter({type: 'draft'})).toBe('status:draft');
    });

    it('passes the paid+tiers visibility value through untouched', () => {
        // Ember treats this as an opaque option value, not as structure.
        expect(buildAllFilter({visibility: '[paid,tiers]'}))
            .toBe('visibility:[paid,tiers]+status:[draft,scheduled,published,sent]');
    });

    it('narrows to the current user for authors and contributors', () => {
        expect(buildAllFilter({author: 'someone-else'}, {ownAuthorSlug: 'me'}))
            .toBe('status:[draft,scheduled,published,sent]+authors:me');
    });

    it('uses the author param when the user is not scoped to their own posts', () => {
        expect(buildAllFilter({author: 'jo'}, {}))
            .toBe('status:[draft,scheduled,published,sent]+authors:jo');
    });
});

describe('getActiveBuckets', () => {
    it('runs all three buckets in order when no type is set', () => {
        expect(getActiveBuckets({})).toEqual(['scheduled', 'draft', 'publishedAndSent']);
    });

    it('matches the documented render order', () => {
        expect(BUCKET_ORDER).toEqual(['scheduled', 'draft', 'publishedAndSent']);
    });

    it.each([
        ['draft', ['draft']],
        ['scheduled', ['scheduled']],
        ['published', ['publishedAndSent']],
        ['sent', ['publishedAndSent']]
    ])('runs a single bucket for type=%s', (type, expected) => {
        expect(getActiveBuckets({type})).toEqual(expected);
    });

    it('runs all three for featured, which spans every status', () => {
        expect(getActiveBuckets({type: 'featured'})).toEqual(['scheduled', 'draft', 'publishedAndSent']);
    });
});

describe('buildBucketFilter', () => {
    it('replaces the status clause in place, keeping clause order', () => {
        expect(buildBucketFilter('scheduled', {tag: 'news', author: 'jo'}))
            .toBe('tag:news+status:scheduled+authors:jo');
    });

    it('combines published and sent into one bucket', () => {
        expect(buildBucketFilter('publishedAndSent', {})).toBe('status:[published,sent]');
    });

    // With type=published only published is wanted, even though the bucket is
    // shared with sent - otherwise filtering by Published would show emails.
    it('narrows the shared bucket to just the requested status', () => {
        expect(buildBucketFilter('publishedAndSent', {type: 'published'})).toBe('status:published');
        expect(buildBucketFilter('publishedAndSent', {type: 'sent'})).toBe('status:sent');
    });

    it('keeps featured:true on every bucket', () => {
        expect(buildBucketFilter('draft', {type: 'featured'})).toBe('status:draft+featured:true');
    });
});

describe('getBucketOrder', () => {
    // Drafts have no published_at, so they sort by when they were last touched.
    it('defaults drafts to recently updated and the rest to publish date', () => {
        expect(getBucketOrder('draft', null)).toBe('updated_at desc');
        expect(getBucketOrder('scheduled', null)).toBe('published_at desc');
        expect(getBucketOrder('publishedAndSent', null)).toBe('published_at desc');
    });

    it('lets an explicit order override every bucket', () => {
        expect(getBucketOrder('draft', 'published_at asc')).toBe('published_at asc');
        expect(getBucketOrder('scheduled', 'published_at asc')).toBe('published_at asc');
        expect(getBucketOrder('publishedAndSent', 'updated_at desc')).toBe('updated_at desc');
    });
});

describe('getBucketSearchParams', () => {
    it('requests 30 per page, matching Ember', () => {
        expect(getBucketSearchParams('draft', {})).toMatchObject({limit: '30'});
    });

    it('carries the bucket filter and order', () => {
        expect(getBucketSearchParams('scheduled', {tag: 'news'})).toEqual({
            filter: 'tag:news+status:scheduled',
            order: 'published_at desc',
            limit: '30'
        });
    });

    // Omitting these is not an optimisation - the server fills both in
    // (defaultFormat, defaultRelations). Sending `columns` would actively hurt:
    // it suppresses the default relations the list needs.
    it('sends neither formats nor include, leaving the server defaults', () => {
        const params = getBucketSearchParams('draft', {});

        expect(params).not.toHaveProperty('formats');
        expect(params).not.toHaveProperty('include');
        expect(params).not.toHaveProperty('columns');
    });
});
