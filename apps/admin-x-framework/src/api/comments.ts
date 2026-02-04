import {InfiniteData} from '@tanstack/react-query';
import {
    Meta,
    createInfiniteQuery,
    createMutation,
    createQueryWithId
} from '../utils/api/hooks';

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
    member?: {
        id: string;
        name: string;
        email: string;
        avatar_image?: string;
        can_comment?: boolean;
    };
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
        likes?: number;
        reports?: number;
    };
    // Optional nested replies for tree structures
    replies?: Comment[];
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
        include: 'member,post,count.replies,count.likes,count.reports,parent'
    }
});
