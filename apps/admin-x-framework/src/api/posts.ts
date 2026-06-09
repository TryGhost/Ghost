import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createQuery, createQueryWithId, createMutation} from '../utils/api/hooks';

export type Email = {
    opened_count: number;
    email_count: number;
    status?: string;
};

export type PostAuthor = {
    id: string;
    name: string;
    slug: string;
};

export type PostTag = {
    id: string;
    name: string;
    slug: string;
};

export type Post = {
    id: string;
    url: string;
    slug: string;
    title: string;
    visibility?: string;
    uuid: string;
    feature_image?: string;
    featured?: boolean;
    excerpt?: string;
    custom_excerpt?: string;
    authors?: PostAuthor[];
    primary_tag?: PostTag | null;
    tags?: PostTag[];
    tiers?: {id: string; name: string}[];
    count?: {
        clicks?: number;
        positive_feedback?: number;
        negative_feedback?: number;
    };
    email?: Email;
    status?: string;
    published_at?: string;
    updated_at?: string;
    created_at?: string;
    newsletter_id?: string;
    newsletter?: object;
    email_only?: boolean;
    email_segment?: string;
    email_recipient_filter?: string;
    send_email_when_published?: boolean;
    email_stats?: object;
};

export interface PostsResponseType {
    meta?: Meta
    posts: Post[];
}

const dataType = 'PostsResponseType';

export const useBrowsePosts = createQuery<PostsResponseType>({
    dataType,
    path: '/posts/'
});

export const useBrowsePostsInfinite = createInfiniteQuery<PostsResponseType & {isEnd: boolean}>({
    dataType,
    path: '/posts/',
    defaultNextPageParams: (lastPage, otherParams) => {
        if (!lastPage.meta?.pagination.next) {
            return undefined;
        }

        return {
            ...otherParams,
            page: lastPage.meta.pagination.next.toString()
        };
    },
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<PostsResponseType>;
        const posts = pages.flatMap(page => page.posts);
        const meta = pages[pages.length - 1].meta;

        return {
            posts,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const getPost = createQueryWithId<PostsResponseType>({
    dataType,
    path: id => `/posts/${id}/`
});

export const useDeletePost = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/posts/${id}/`
});

// ---- bulk operations over an NQL filter (used by the posts/pages list) ----

export type BulkEditAction = 'feature' | 'unfeature' | 'unpublish' | 'unschedule' | 'addTag' | 'access';

export interface BulkEditPostsPayload {
    action: BulkEditAction;
    filter: string;
    meta?: Record<string, unknown>;
    resource?: 'posts' | 'pages';
}

export interface BulkEditPostsResponse {
    bulk: {
        action: BulkEditAction;
        meta: {
            stats: {successful: number; unsuccessful: number};
            errors: unknown[];
            unsuccessfulData: unknown[];
        };
    };
}

export const useBulkEditPosts = createMutation<BulkEditPostsResponse, BulkEditPostsPayload>({
    method: 'PUT',
    path: ({resource = 'posts'}) => `/${resource}/bulk/`,
    searchParams: ({filter}) => ({filter}),
    body: ({action, meta}) => ({bulk: {action, meta: meta ?? {}}})
});

export const useBulkDeletePosts = createMutation<unknown, {filter: string; resource?: 'posts' | 'pages'}>({
    method: 'DELETE',
    path: ({resource = 'posts'}) => `/${resource}/`,
    searchParams: ({filter}) => ({filter})
});

export const useCopyPost = createMutation<PostsResponseType, {id: string; resource?: 'posts' | 'pages'}>({
    method: 'POST',
    path: ({id, resource = 'posts'}) => `/${resource}/${id}/copy/`,
    defaultSearchParams: {formats: 'mobiledoc,lexical'}
});

// Search index endpoints for efficient search
export const useSearchIndexPosts = createQuery<PostsResponseType>({
    dataType,
    path: '/search-index/posts/'
});
