import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';
import {InfiniteData} from '@tanstack/react-query';

export type CommentMember = {
    id: string;
    name: string | null;
    email: string;
    avatar_image: string | null;
    commenting_enabled?: boolean;
};

export type CommentPost = {
    id: string;
    title: string;
    slug: string;
    url: string;
};

export type Comment = {
    id: string;
    html: string;
    status: 'published' | 'hidden' | 'deleted';
    created_at: string;
    member_id: string | null;
    member?: CommentMember | null;
    post_id: string;
    post?: CommentPost;
    parent_id: string | null;
    hidden_at_ban?: boolean;
    count?: {
        replies?: number;
        likes?: number;
    };
};

export interface CommentsResponseType {
    meta?: Meta;
    comments: Comment[];
}

export interface BulkEditResponse {
    bulk: {
        action: string;
        meta: {
            stats: {
                successful: number;
                unsuccessful: number;
            };
            errors: unknown[];
        };
    };
}

const dataType = 'CommentsResponseType';

export const useBrowseComments = createInfiniteQuery<CommentsResponseType>({
    dataType,
    path: '/comments/',
    defaultSearchParams: {
        include: 'member,post',
        limit: '30',
        order: 'created_at desc'
    },
    defaultNextPageParams: (lastPage, params) => {
        if (!lastPage.meta?.pagination?.next) {
            return undefined;
        }
        return {
            ...params,
            page: lastPage.meta.pagination.next.toString()
        };
    },
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<CommentsResponseType>;
        const comments = pages.flatMap(page => page.comments);
        const meta = pages[pages.length - 1].meta;
        return {
            comments,
            meta,
            isEnd: meta ? !meta.pagination.next : true
        };
    }
});

export const useHideComment = createMutation<CommentsResponseType, string>({
    method: 'PUT',
    path: id => `/comments/${id}/`,
    body: id => ({
        comments: [{id, status: 'hidden'}]
    }),
    invalidateQueries: {dataType}
});

export const useShowComment = createMutation<CommentsResponseType, string>({
    method: 'PUT',
    path: id => `/comments/${id}/`,
    body: id => ({
        comments: [{id, status: 'published'}]
    }),
    invalidateQueries: {dataType}
});

export const useDeleteComment = createMutation<CommentsResponseType, string>({
    method: 'PUT',
    path: id => `/comments/${id}/`,
    body: id => ({
        comments: [{id, status: 'deleted'}]
    }),
    invalidateQueries: {dataType}
});

export interface BulkEditPayload {
    filter?: string;
    action: 'hide' | 'show' | 'delete';
}

export const useBulkEditComments = createMutation<BulkEditResponse, BulkEditPayload>({
    method: 'PUT',
    path: () => '/comments/bulk/',
    searchParams: payload => {
        if (!payload.filter) {
            return undefined;
        }
        return {filter: payload.filter};
    },
    body: payload => ({
        bulk: {
            action: payload.action
        }
    }),
    invalidateQueries: {dataType}
});
