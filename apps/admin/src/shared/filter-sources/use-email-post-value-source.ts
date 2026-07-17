import {type Post, type PostsResponseType, useBrowsePostsInfinite} from '@tryghost/admin-x-framework/api/posts';
import {type ValueSource} from '@tryghost/shade/patterns';
import {createGhostBrowseValueSource} from './create-ghost-browse-value-source';
import {escapeNqlString} from '@/shared/filters/filter-normalization';
import {keepPreviousData} from '@tanstack/react-query';

const EMAIL_BASE_FILTER = '(status:published,status:sent)+newsletter_id:-null';

function buildEmailFilter(query: string) {
    return query ? `${EMAIL_BASE_FILTER}+title:~${escapeNqlString(query)}` : EMAIL_BASE_FILTER;
}

function toPostOption(post: Post) {
    return {
        value: post.id,
        label: post.title
    };
}

const useRemoteEmailPostValueSource = createGhostBrowseValueSource<Post, PostsResponseType>({
    id: 'posts.email.remote',
    buildBrowseSearchParams: query => ({
        filter: buildEmailFilter(query),
        limit: '25',
        fields: 'id,title',
        order: 'published_at DESC'
    }),
    buildHydrateSearchParams: selectedFilter => ({
        fields: 'id,title',
        filter: selectedFilter
    }),
    selectItems: data => data?.posts,
    useQuery: ({enabled, searchParams}) => {
        return useBrowsePostsInfinite({
            enabled,
            placeholderData: keepPreviousData,
            searchParams
        });
    },
    toOption: toPostOption
});

export function useEmailPostValueSource(): ValueSource<string> {
    return useRemoteEmailPostValueSource();
}
