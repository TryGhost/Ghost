import {QueryClient, queryOptions, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Comment, useAppContext} from '../app-context';
import {GhostApi} from './api';

// Query client with sensible defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Comments are relatively stable - 30 second stale time
            // reduces refetches while keeping data reasonably fresh
            staleTime: 30 * 1000,
            // Retry once on failure
            retry: 1
        }
    }
});

// Query key factory - hierarchical structure for selective invalidation
export const commentKeys = {
    all: ['comments'] as const,
    lists: () => [...commentKeys.all, 'list'] as const,
    list: (postId: string, order: string) => [...commentKeys.lists(), postId, order] as const,
    replies: () => [...commentKeys.all, 'replies'] as const,
    reply: (commentId: string) => [...commentKeys.replies(), commentId] as const
};

// Query options factory for comments list
export function commentsQuery(api: GhostApi, postId: string, order: string, page = 1) {
    return queryOptions({
        queryKey: commentKeys.list(postId, order),
        queryFn: async () => {
            const data = await api.comments.browse({page, postId, order});
            return {
                comments: data.comments as Comment[],
                pagination: data.meta.pagination
            };
        }
    });
}

// Query options factory for replies
export function repliesQuery(api: GhostApi, commentId: string) {
    return queryOptions({
        queryKey: commentKeys.reply(commentId),
        queryFn: async () => {
            const data = await api.comments.replies({commentId, limit: 10000});
            return data.comments as Comment[];
        }
    });
}

/**
 * Hook to fetch comments for a post.
 * Components consume this instead of context state.
 * Only fetches after initialization is complete.
 */
export function useComments() {
    const {api, postId, order, initStatus} = useAppContext();
    return useQuery({
        ...commentsQuery(api, postId, order),
        // Only fetch after app initialization completes (member auth, etc.)
        enabled: initStatus === 'success'
    });
}

/**
 * Hook to fetch all replies for a specific comment.
 * Use when you need fresh reply data (e.g., after posting).
 */
export function useReplies(commentId: string, enabled = true) {
    const {api} = useAppContext();
    return useQuery({
        ...repliesQuery(api, commentId),
        enabled
    });
}

/**
 * Hook to add a reply.
 * Just POSTs, then invalidates - useQuery subscribers auto-refetch.
 */
export function useAddReply() {
    const {api, postId, order, dispatchAction} = useAppContext();
    const queryClientInstance = useQueryClient();

    return useMutation({
        mutationFn: async ({reply, parentId}: {
            reply: {post_id: string; in_reply_to_id?: string; status: string; html: string};
            parentId: string;
        }) => {
            const data = await api.comments.add({
                comment: {...reply, parent_id: parentId}
            });
            return data.comments[0] as Comment;
        },
        onSuccess: (newComment, {parentId}) => {
            // Invalidate replies for this parent - any useReplies subscribers will refetch
            queryClientInstance.invalidateQueries({queryKey: commentKeys.reply(parentId)});

            // Also invalidate the comments list since it contains nested replies
            queryClientInstance.invalidateQueries({queryKey: commentKeys.list(postId, order)});

            // Update comment count in state
            dispatchAction('incrementCommentCount', null);

            // Scroll to the new comment
            dispatchAction('setScrollTarget', newComment.id);
        }
    });
}

/**
 * Hook to add a top-level comment.
 * Just POSTs, then invalidates - useQuery subscribers auto-refetch.
 */
export function useAddComment() {
    const {api, postId, order, dispatchAction} = useAppContext();
    const queryClientInstance = useQueryClient();

    return useMutation({
        mutationFn: async (comment: {post_id: string; status: string; html: string}) => {
            const data = await api.comments.add({comment});
            return data.comments[0] as Comment;
        },
        onSuccess: (newComment) => {
            // Invalidate comments list - any useComments subscribers will refetch
            queryClientInstance.invalidateQueries({queryKey: commentKeys.list(postId, order)});

            // Update comment count in state
            dispatchAction('incrementCommentCount', null);

            // Scroll to the new comment
            dispatchAction('setScrollTarget', newComment.id);
        }
    });
}

/**
 * Hook to get comment count.
 */
export function useCommentCount() {
    const {api, postId} = useAppContext();
    return useQuery({
        queryKey: [...commentKeys.all, 'count', postId],
        queryFn: () => api.comments.count({postId})
    });
}
