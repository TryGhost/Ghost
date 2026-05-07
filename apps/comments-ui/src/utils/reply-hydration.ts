import {Comment} from '../app-context';

type PublicRepliesApi = {
    comments: {
        replies: ({commentId, limit}: {commentId: string; limit: 'all'}) => Promise<{comments: Comment[]}>;
    };
};

type AdminRepliesApi = {
    replies: ({commentId, afterReplyId, limit, memberUuid}: {commentId: string; afterReplyId?: string; limit?: number; memberUuid?: string}) => Promise<{comments: Comment[]; meta?: {pagination?: {next?: number | false | null}}}>;
};

type HydrateVisibleRepliesOptions = {
    comments: Comment[];
    api?: PublicRepliesApi;
    adminApi?: AdminRepliesApi | null;
    memberUuid?: string;
};

async function fetchAdminReplies(adminApi: AdminRepliesApi, commentId: string, memberUuid?: string) {
    const replies: Comment[] = [];
    let afterReplyId: string | undefined;
    let hasMore = true;

    while (hasMore) {
        const data = await adminApi.replies({
            commentId,
            afterReplyId,
            limit: 100,
            memberUuid
        });

        replies.push(...data.comments);
        hasMore = !!data.meta?.pagination?.next && data.comments.length > 0;

        if (data.comments.length > 0) {
            afterReplyId = data.comments[data.comments.length - 1]?.id;
        }
    }

    return replies;
}

export async function hydrateVisibleReplies({comments, api, adminApi, memberUuid}: HydrateVisibleRepliesOptions) {
    return Promise.all(comments.map(async (comment) => {
        if (!comment.count?.replies) {
            return comment;
        }

        try {
            const replies = adminApi
                ? await fetchAdminReplies(adminApi, comment.id, memberUuid)
                : (await api!.comments.replies({commentId: comment.id, limit: 'all'})).comments;

            return {
                ...comment,
                replies,
                count: {
                    ...comment.count,
                    replies: replies.length
                }
            };
        } catch (error) {
            console.warn('[Comments] Failed to hydrate replies:', error); // eslint-disable-line no-console
            return comment;
        }
    }));
}
