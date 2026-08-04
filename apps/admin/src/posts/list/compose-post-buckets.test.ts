import {describe, expect, it} from 'vitest';
import {composePostBuckets, type PostBucketResult} from './compose-post-buckets';

interface Item {
    id: string;
}

function bucketResult(overrides: Partial<PostBucketResult<Item>> = {}): PostBucketResult<Item> {
    return {
        bucket: 'scheduled',
        items: [],
        total: 0,
        hasNextPage: false,
        isLoading: false,
        isFetchingNextPage: false,
        isError: false,
        fetchNextPage: () => {},
        ...overrides
    };
}

const item = (id: string): Item => ({id});

describe('composePostBuckets', () => {
    it('is empty with no buckets', () => {
        const result = composePostBuckets<Item>([]);

        expect(result.items).toEqual([]);
        expect(result.totalItems).toBe(0);
        expect(result.hasNextPage).toBe(false);
        expect(result.isLoading).toBe(false);
    });

    it('reports loading only while nothing can be shown yet', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', isLoading: true}),
            bucketResult({bucket: 'draft', isLoading: true})
        ]);

        expect(result.isLoading).toBe(true);
        expect(result.items).toEqual([]);
    });

    // Only *later* buckets depend on earlier ones. Holding the whole list until
    // every bucket has answered would let one slow query hide everything.
    it('shows an earlier bucket while a later one is still loading', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', items: [item('s1')], total: 1}),
            bucketResult({bucket: 'draft', isLoading: true})
        ]);

        expect(result.isLoading).toBe(false);
        expect(result.items.map(entry => entry.id)).toEqual(['s1']);
    });

    // ...but a later bucket must never jump ahead of one that hasn't answered,
    // or drafts flash in above scheduled.
    it('hides a later bucket while an earlier one is still loading', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', isLoading: true}),
            bucketResult({bucket: 'draft', items: [item('d1')], total: 1})
        ]);

        expect(result.items).toEqual([]);
        expect(result.isLoading).toBe(true);
    });

    it('concatenates buckets in order once everything has loaded', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', items: [item('s1')], total: 1}),
            bucketResult({bucket: 'draft', items: [item('d1')], total: 1}),
            bucketResult({bucket: 'publishedAndSent', items: [item('p1')], total: 1})
        ]);

        expect(result.items.map(entry => entry.id)).toEqual(['s1', 'd1', 'p1']);
        expect(result.totalItems).toBe(3);
        expect(result.isLoading).toBe(false);
    });

    // Ember drains each bucket fully before the next one renders.
    it('hides later buckets until the earlier ones are exhausted', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', items: [item('s1')], total: 40, hasNextPage: true}),
            bucketResult({bucket: 'draft', items: [item('d1')], total: 5}),
            bucketResult({bucket: 'publishedAndSent', items: [item('p1')], total: 5})
        ]);

        expect(result.items.map(entry => entry.id)).toEqual(['s1']);
    });

    it('opens the next bucket once the one before it is exhausted', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', items: [item('s1')], total: 1}),
            bucketResult({bucket: 'draft', items: [item('d1')], total: 40, hasNextPage: true}),
            bucketResult({bucket: 'publishedAndSent', items: [item('p1')], total: 5})
        ]);

        expect(result.items.map(entry => entry.id)).toEqual(['s1', 'd1']);
    });

    // The common case: most sites have nothing scheduled, so that bucket
    // reports "no more pages" on its first response and drafts show at once.
    it('skips straight past an empty bucket', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', items: [], total: 0}),
            bucketResult({bucket: 'draft', items: [item('d1')], total: 1}),
            bucketResult({bucket: 'publishedAndSent', items: [item('p1')], total: 1})
        ]);

        expect(result.items.map(entry => entry.id)).toEqual(['d1', 'p1']);
    });

    it('counts every bucket, including ones not yet visible', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', items: [item('s1')], total: 40, hasNextPage: true}),
            bucketResult({bucket: 'draft', items: [], total: 12}),
            bucketResult({bucket: 'publishedAndSent', items: [], total: 100})
        ]);

        expect(result.totalItems).toBe(152);
    });

    describe('paging', () => {
        it('has a next page while any bucket does', () => {
            const result = composePostBuckets<Item>([
                bucketResult({bucket: 'scheduled', total: 1}),
                bucketResult({bucket: 'draft', total: 40, hasNextPage: true})
            ]);

            expect(result.hasNextPage).toBe(true);
        });

        it('pages the earliest bucket that still has more', () => {
            let scheduledFetched = 0;
            let draftFetched = 0;

            const result = composePostBuckets<Item>([
                bucketResult({
                    bucket: 'scheduled', total: 40, hasNextPage: true, fetchNextPage: () => {
                        scheduledFetched += 1;
                    }
                }),
                bucketResult({
                    bucket: 'draft', total: 40, hasNextPage: true, fetchNextPage: () => {
                        draftFetched += 1;
                    }
                })
            ]);

            result.fetchNextPage();

            expect(scheduledFetched).toBe(1);
            expect(draftFetched).toBe(0);
        });

        it('does nothing when everything is loaded', () => {
            const result = composePostBuckets<Item>([bucketResult({bucket: 'draft', total: 1})]);

            expect(() => {
                result.fetchNextPage();
            }).not.toThrow();
            expect(result.hasNextPage).toBe(false);
        });

        it('reports fetching only for the bucket currently paging', () => {
            const result = composePostBuckets<Item>([
                bucketResult({bucket: 'scheduled', total: 40, hasNextPage: true, isFetchingNextPage: true}),
                bucketResult({bucket: 'draft', total: 40, hasNextPage: true})
            ]);

            expect(result.isFetchingNextPage).toBe(true);
        });
    });

    it('reports an error if any bucket failed', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled'}),
            bucketResult({bucket: 'draft', isError: true})
        ]);

        expect(result.isError).toBe(true);
    });

    // A failed bucket never drained, so treating it as exhausted would let the
    // next one silently take its place in the list.
    it('does not open a later bucket behind a failed one', () => {
        const result = composePostBuckets<Item>([
            bucketResult({bucket: 'scheduled', isError: true}),
            bucketResult({bucket: 'draft', items: [item('d1')], total: 1})
        ]);

        expect(result.items).toEqual([]);
    });
});
