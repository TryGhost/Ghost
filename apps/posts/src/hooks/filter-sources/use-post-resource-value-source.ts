import {Page, PagesResponseType, useBrowsePagesInfinite} from '@tryghost/admin-x-framework/api/pages';
import {Post, PostsResponseType, useBrowsePostsInfinite} from '@tryghost/admin-x-framework/api/posts';
import {ValueSource} from '@tryghost/shade/patterns';
import {createCombinedValueSource} from './create-combined-value-source';
import {createGhostBrowseValueSource} from './create-ghost-browse-value-source';
import {escapeNqlString} from '@src/views/filters/filter-normalization';

function buildPublishedFilter(query: string) {
    return query ? `status:published+title:~${escapeNqlString(query)}` : 'status:published';
}

function toPostOption(post: Post) {
    return {
        value: post.id,
        label: post.title
    };
}

function toPageOption(page: Page) {
    return {
        value: page.id,
        label: page.title,
        detail: 'Page'
    };
}

const buildPublishedSearchParams = (query: string) => ({
    filter: buildPublishedFilter(query),
    limit: '25',
    fields: 'id,title',
    order: 'published_at DESC'
});

const buildHydrateSearchParams = (selectedFilter: string) => ({
    fields: 'id,title',
    filter: selectedFilter
});

const usePublishedPostValueSource = createGhostBrowseValueSource<Post, PostsResponseType>({
    id: 'posts.published.remote',
    buildBrowseSearchParams: buildPublishedSearchParams,
    buildHydrateSearchParams,
    selectItems: data => data?.posts,
    useQuery: ({enabled, searchParams}) => {
        return useBrowsePostsInfinite({
            enabled,
            keepPreviousData: true,
            searchParams
        });
    },
    toOption: toPostOption
});

const usePublishedPageValueSource = createGhostBrowseValueSource<Page, PagesResponseType>({
    id: 'pages.published.remote',
    buildBrowseSearchParams: buildPublishedSearchParams,
    buildHydrateSearchParams,
    selectItems: data => data?.pages,
    useQuery: ({enabled, searchParams}) => {
        return useBrowsePagesInfinite({
            enabled,
            keepPreviousData: true,
            searchParams
        });
    },
    toOption: toPageOption
});

const useCombinedPostResourceValueSource = createCombinedValueSource(
    usePublishedPostValueSource,
    usePublishedPageValueSource
);

export function usePostResourceValueSource(): ValueSource<string> {
    return useCombinedPostResourceValueSource();
}
