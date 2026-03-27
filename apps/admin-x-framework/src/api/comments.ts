import {InfiniteData} from '@tanstack/react-query';
import {
    Meta,
    createInfiniteQuery,
    createMutation,
    createQueryWithId
} from '../utils/api/hooks';
import {Member} from './members';

export type Comment = {
    id: string;
    html: string | null;
    status: 'published' | 'hidden' | 'deleted';
    created_at: string;
    updated_at: string;
    post_id: string;
    member_id: string;
    parent_id: string | null;
    in_reply_to_id?: string | null;
    in_reply_to_snippet?: string | null;
    member?: Member;
    post?: {
        id: string;
        title: string;
        slug: string;
        url: string;
        feature_image?: string;
        excerpt?: string;
    };
    count?: {
        replies?: number;
        direct_replies?: number;
        likes?: number;
        reports?: number;
    };
    // Optional nested replies for tree structures
    replies?: Comment[];
};

export type CommentReport = {
    id: string;
    comment_id: string;
    member_id: string;
    created_at: string;
    updated_at: string;
    member?: Member;
};

export type CommentLike = {
    id: string;
    comment_id: string;
    member_id: string;
    created_at: string;
    updated_at: string;
    member?: Member;
};

export interface CommentsResponseType {
    meta?: Meta;
    comments: Comment[];
}

const dataType = 'CommentsResponseType';

const useBrowseCommentsQuery = createInfiniteQuery<CommentsResponseType>({
    dataType,
    path: '/comments/',
    defaultNextPageParams: (lastPage, otherParams) => (lastPage.meta?.pagination.next
        ? {
            ...otherParams,
            page: (lastPage.meta?.pagination.next || 1).toString()
        }
        : undefined),
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<CommentsResponseType>;
        const comments = pages.flatMap(page => page.comments);
        const meta = pages[pages.length - 1].meta;

        return {
            comments,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const useBrowseComments = (args?: Parameters<typeof useBrowseCommentsQuery>[0]) => {
    return useBrowseCommentsQuery({
        ...args,
        searchParams: {
            limit: '100',
            order: 'created_at desc',
            include: 'member,post,parent',
            ...args?.searchParams
        }
    });
};

export const useHideComment = createMutation<CommentsResponseType, {id: string}>({
    method: 'PUT',
    path: ({id}) => `/comments/${id}/`,
    body: ({id}) => ({
        comments: [{
            id,
            status: 'hidden'
        }]
    }),
    invalidateQueries: {
        dataType
    }
});

export const useShowComment = createMutation<CommentsResponseType, {id: string}>({
    method: 'PUT',
    path: ({id}) => `/comments/${id}/`,
    body: ({id}) => ({
        comments: [{
            id,
            status: 'published'
        }]
    }),
    invalidateQueries: {
        dataType
    }
});

export const useDeleteComment = createMutation<CommentsResponseType, {id: string}>({
    method: 'PUT',
    path: ({id}) => `/comments/${id}/`,
    body: ({id}) => ({
        comments: [{
            id,
            status: 'deleted'
        }]
    }),
    invalidateQueries: {
        dataType
    }
});

export const useCommentReplies = createQueryWithId<CommentsResponseType>({
    dataType,
    path: (id: string) => `/comments/${id}/replies/`,
    defaultSearchParams: {
        include: 'member,post,count.replies,count.likes,count.reports,parent',
        limit: '100' // Max limit allowed by API
    }
});

export const useReadComment = createQueryWithId<CommentsResponseType>({
    dataType,
    path: (id: string) => `/comments/${id}/`,
    defaultSearchParams: {
        include: 'member,post,count.replies,count.direct_replies,count.likes,count.reports,parent,in_reply_to'
    }
});

export interface CommentReportsResponseType {
    meta?: Meta;
    comment_reports: CommentReport[];
}

const useBrowseCommentReportsQuery = createQueryWithId<CommentReportsResponseType>({
    dataType: 'CommentReportsResponseType',
    path: id => `/comments/${id}/reports/`
});

export const useBrowseCommentReports = (commentId: string, options?: {enabled?: boolean}) => {
    return useBrowseCommentReportsQuery(commentId, {...options});
};

export interface CommentLikesResponseType {
    meta?: Meta;
    comment_likes: CommentLike[];
}

const useBrowseCommentLikesQuery = createQueryWithId<CommentLikesResponseType>({
    dataType: 'CommentLikesResponseType',
    path: id => `/comments/${id}/likes/`,
    defaultSearchParams: {
        include: 'member',
        limit: '100',
        order: 'created_at desc'
    }
});

export const useBrowseCommentLikes = (commentId: string, options?: {enabled?: boolean}) => {
    return useBrowseCommentLikesQuery(commentId, {...options});
};

/**
 * Fetches direct replies for a thread view.
 * - For top-level comments: returns comments where parent_id matches AND in_reply_to_id is null
 * - For nested comments: returns comments where in_reply_to_id matches
 */
export const useThreadComments = (commentId: string, options?: {enabled?: boolean}) => {
    return useBrowseComments({
        ...options,
        searchParams: {
            filter: `(parent_id:${commentId}+in_reply_to_id:null),in_reply_to_id:${commentId}`,
            order: 'created_at asc',
            include: 'member,post,count.direct_replies,count.likes,count.reports,parent,in_reply_to',
            limit: '100'
        }
    });
};
