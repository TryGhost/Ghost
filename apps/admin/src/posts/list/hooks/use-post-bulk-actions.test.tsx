import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {usePostBulkActions, type BulkActionSnapshot} from './use-post-bulk-actions';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {ReactNode} from 'react';

vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
    useBulkEditPosts: () => ({mutateAsync: vi.fn().mockResolvedValue({})}),
    useBulkDeletePosts: () => ({mutateAsync: vi.fn().mockResolvedValue({})})
}));

vi.mock('@tryghost/admin-x-framework/api/pages', () => ({
    useBulkEditPages: () => ({mutateAsync: vi.fn().mockResolvedValue({})}),
    useBulkDeletePages: () => ({mutateAsync: vi.fn().mockResolvedValue({})})
}));

vi.mock('sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn()}
}));

/**
 * The cache surgery `run()` performs — pruning, the exact-filter predicate,
 * and the `meta.pagination.total` arithmetic. The user-visible half lives in
 * the acceptance tests; the totals are not observable there, and they feed
 * the selection count, so they get pinned here.
 */
describe('usePostBulkActions cache patching', () => {
    const PUBLISHED_FILTER = 'status:[published,sent]';
    const DRAFT_FILTER = 'status:draft';

    const bucketUrl = (filter: string) => `/ghost/api/admin/posts/?filter=${encodeURIComponent(filter)}&order=published_at%20desc&limit=30`;

    const listPost = (id: string, status: string): PostListItem => ({id, status, title: id} as PostListItem);

    const seedBucket = (queryClient: QueryClient, filter: string, posts: PostListItem[], total: number) => {
        queryClient.setQueryData(['PostsResponseType', bucketUrl(filter)], {
            pageParams: [undefined],
            pages: [{posts, meta: {pagination: {total, page: 1, limit: 30, pages: 1, next: null, prev: null}}}]
        });
    };

    const readBucket = (queryClient: QueryClient, filter: string) => {
        return queryClient.getQueryData<{
            pages: {posts: PostListItem[]; meta: {pagination: {total: number}}}[];
        }>(['PostsResponseType', bucketUrl(filter)]);
    };

    const snapshot = (overrides: Partial<BulkActionSnapshot> = {}): BulkActionSnapshot => ({
        filter: 'id:[p1]',
        posts: [listPost('p1', 'published')],
        count: 1,
        isSingle: true,
        inverted: false,
        bucketFilters: [PUBLISHED_FILTER],
        ...overrides
    });

    let queryClient: QueryClient;

    const renderBulkActions = () => {
        const wrapper = ({children}: {children: ReactNode}) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        return renderHook(() => usePostBulkActions({resource: 'posts'}), {wrapper}).result;
    };

    beforeEach(() => {
        queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    });

    it('removes deleted rows and decrements the total', async () => {
        seedBucket(queryClient, PUBLISHED_FILTER, [listPost('p1', 'published'), listPost('p2', 'published')], 40);
        const result = renderBulkActions();

        await result.current.run('delete', snapshot());

        const bucket = readBucket(queryClient, PUBLISHED_FILTER);
        expect(bucket?.pages[0].posts.map(post => post.id)).toEqual(['p2']);
        expect(bucket?.pages[0].meta.pagination.total).toBe(39);
    });

    it('sets the total to the surviving exclusions after an inverted delete', async () => {
        // Cmd+A minus p2: the server deletes everything matching the filter,
        // including rows never loaded — the old total is meaningless.
        seedBucket(queryClient, PUBLISHED_FILTER, [listPost('p1', 'published'), listPost('p2', 'published')], 40);
        const result = renderBulkActions();

        await result.current.run('delete', snapshot({
            filter: `(${PUBLISHED_FILTER})+id:-[p2]`,
            posts: [listPost('p1', 'published')],
            count: 39,
            isSingle: false,
            inverted: true
        }));

        const bucket = readBucket(queryClient, PUBLISHED_FILTER);
        expect(bucket?.pages[0].posts.map(post => post.id)).toEqual(['p2']);
        expect(bucket?.pages[0].meta.pagination.total).toBe(1);
    });

    it('prunes an edited row from its bucket without touching the total', async () => {
        // The post still exists after an unpublish — it only left this bucket.
        // Decrementing here would shrink the list-wide count the selection
        // reads on the next Cmd+A.
        seedBucket(queryClient, PUBLISHED_FILTER, [listPost('p1', 'published'), listPost('p2', 'published')], 40);
        const result = renderBulkActions();

        await result.current.run('unpublish', snapshot());

        const bucket = readBucket(queryClient, PUBLISHED_FILTER);
        expect(bucket?.pages[0].posts.map(post => post.id)).toEqual(['p2']);
        expect(bucket?.pages[0].meta.pagination.total).toBe(40);
    });

    it('leaves a list whose filter merely extends the bucket filter alone', async () => {
        // `status:draft` is a prefix of `status:draft+featured:true`; substring
        // matching patched the featured list too and pruned it against a
        // filter that was not its own.
        seedBucket(queryClient, DRAFT_FILTER, [listPost('p1', 'draft')], 10);
        seedBucket(queryClient, `${DRAFT_FILTER}+featured:true`, [listPost('p1', 'draft')], 5);
        const result = renderBulkActions();

        await result.current.run('delete', snapshot({bucketFilters: [DRAFT_FILTER], posts: [listPost('p1', 'draft')]}));

        expect(readBucket(queryClient, DRAFT_FILTER)?.pages[0].posts).toEqual([]);
        expect(readBucket(queryClient, `${DRAFT_FILTER}+featured:true`)?.pages[0].posts.map(post => post.id)).toEqual(['p1']);
    });
});
