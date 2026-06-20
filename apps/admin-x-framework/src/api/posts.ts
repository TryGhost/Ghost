import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createQuery, createQueryWithId, createMutation} from '../utils/api/hooks';
import {insertToQueryCache} from '../utils/api/update-queries';

export type Email = {
    opened_count: number;
    email_count: number;
    status?: string;
};

export type Post = {
    id: string;
    authors?: {id: string}[];
    url: string;
    slug: string;
    lexical?: string;
    title: string;
    type?: string;
    visibility?: string;
    uuid: string;
    tags?: unknown[];
    feature_image?: string;
    post_revisions?: unknown[];
    count?: {
        clicks?: number;
        positive_feedback?: number;
        negative_feedback?: number;
    };
    email?: Email;
    status?: string;
    published_at?: string;
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

export const useAddPost = createMutation<PostsResponseType, Partial<Post>>({
    method: 'POST',
    path: () => '/posts/',
    body: post => ({posts: [post]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: insertToQueryCache('posts')
    }
});

export const useDeletePost = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/posts/${id}/`
});

// Search index endpoints for efficient search
export const useSearchIndexPosts = createQuery<PostsResponseType>({
    dataType,
    path: '/search-index/posts/'
});
