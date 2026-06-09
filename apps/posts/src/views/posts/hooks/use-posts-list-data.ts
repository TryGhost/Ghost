import {useBrowsePagesInfinite} from '@tryghost/admin-x-framework/api/pages';
import {useBrowsePostsInfinite} from '@tryghost/admin-x-framework/api/posts';
import type {Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostsListQueries, PostsResource, PostsSectionKey, PostsSectionQuery} from '../posts-query-params';

const PER_PAGE = '30';

export interface PostsListSection {
    key: PostsSectionKey;
    posts: Post[];
    totalItems: number;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
}

interface SectionQueryResult {
    posts: Post[];
    totalItems: number;
    isLoading: boolean;
    isError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    refetch: () => Promise<unknown>;
    isActive: boolean;
}

function useSectionQuery({resource, section, enabled}: {
    resource: PostsResource;
    section?: PostsSectionQuery;
    enabled: boolean;
}): SectionQueryResult {
    const include = resource === 'pages' ? 'tags,authors' : 'tags,authors,count.clicks,email';
    const isActive = enabled && !!section;
    const searchParams = section
        ? {filter: section.filter, order: section.order, limit: PER_PAGE, include}
        : undefined;

    const postsQuery = useBrowsePostsInfinite({
        searchParams,
        enabled: isActive && resource === 'posts',
        keepPreviousData: true
    });
    const pagesQuery = useBrowsePagesInfinite({
        searchParams,
        enabled: isActive && resource === 'pages',
        keepPreviousData: true
    });

    const query = resource === 'pages' ? pagesQuery : postsQuery;
    // The pages API responds with the same shape as the posts API; the Page
    // type in the framework is just a narrower view of it
    const posts: Post[] = resource === 'pages'
        ? ((pagesQuery.data?.pages ?? []) as unknown as Post[])
        : (postsQuery.data?.posts ?? []);
    const meta = resource === 'pages' ? pagesQuery.data?.meta : postsQuery.data?.meta;

    return {
        posts,
        totalItems: meta?.pagination.total ?? posts.length,
        isLoading: isActive && !query.data && !query.isError,
        isError: isActive && query.isError,
        hasNextPage: query.hasNextPage ?? false,
        isFetchingNextPage: query.isFetchingNextPage,
        fetchNextPage: () => {
            void query.fetchNextPage();
        },
        refetch: query.refetch,
        isActive
    };
}

/**
 * Runs the (up to) three infinite section queries for the posts/pages list:
 * scheduled, drafts and published+sent, mirroring the Ember posts route.
 */
export function usePostsListData({resource, queries, enabled}: {
    resource: PostsResource;
    queries: PostsListQueries;
    enabled: boolean;
}) {
    const scheduled = useSectionQuery({resource, section: queries.sections.scheduled, enabled});
    const drafts = useSectionQuery({resource, section: queries.sections.drafts, enabled});
    const published = useSectionQuery({resource, section: queries.sections.published, enabled});

    const sectionResults: Array<{key: PostsSectionKey; result: SectionQueryResult}> = [
        {key: 'scheduled', result: scheduled},
        {key: 'drafts', result: drafts},
        {key: 'published', result: published}
    ].filter(({result}) => result.isActive) as Array<{key: PostsSectionKey; result: SectionQueryResult}>;

    const sections: PostsListSection[] = sectionResults.map(({key, result}) => ({
        key,
        posts: result.posts,
        totalItems: result.totalItems,
        hasNextPage: result.hasNextPage,
        isFetchingNextPage: result.isFetchingNextPage,
        fetchNextPage: result.fetchNextPage
    }));

    const refetchAll = async () => {
        await Promise.all(sectionResults.map(({result}) => result.refetch()));
    };

    return {
        sections,
        isLoading: !enabled || sectionResults.some(({result}) => result.isLoading),
        isError: sectionResults.some(({result}) => result.isError),
        totalItems: sections.reduce((sum, section) => sum + section.totalItems, 0),
        refetchAll
    };
}
