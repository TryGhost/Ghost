import {Comment} from '../app-context';

export type ThreadedReply = Comment & {
    nestedReplies: ThreadedReply[];
    depth: number;
    siblingIndex: number;
    siblingCount: number;
};

export type ThreadGraph = {
    rootComment: Comment;
    roots: ThreadedReply[];
    getWindowForComment: (commentId: string, maxDepth: number) => ThreadWindow | null;
};

export type ThreadWindow = {
    topLevelComment: Comment;
    focusedComment: ThreadedReply;
    backComment: Comment;
};

export function buildThreadGraph(rootComment: Comment): ThreadGraph {
    const replies = rootComment.replies || [];
    const byId = new Map<string, ThreadedReply>();
    const parentById = new Map<string, string | null>();
    const depthById = new Map<string, number>();

    replies.forEach((reply) => {
        byId.set(reply.id, {...reply, depth: 1, nestedReplies: [], siblingIndex: 0, siblingCount: 0});
    });

    const roots: ThreadedReply[] = [];

    replies.forEach((reply) => {
        const threadedReply = byId.get(reply.id);
        if (!threadedReply) {
            return;
        }

        const parentReply = reply.in_reply_to_id ? byId.get(reply.in_reply_to_id) : null;

        if (parentReply && parentReply.id !== threadedReply.id) {
            parentById.set(threadedReply.id, parentReply.id);
            parentReply.nestedReplies.push(threadedReply);
        } else {
            parentById.set(threadedReply.id, null);
            roots.push(threadedReply);
        }
    });

    const assignThreadMetadata = (siblings: ThreadedReply[], depth: number) => {
        siblings.forEach((reply, index) => {
            reply.depth = depth;
            reply.siblingIndex = index;
            reply.siblingCount = siblings.length;
            depthById.set(reply.id, depth);

            assignThreadMetadata(reply.nestedReplies, depth + 1);
        });
    };

    assignThreadMetadata(roots, 1);

    const getReply = (commentId: string) => byId.get(commentId);
    const getAncestorAtDepth = (comment: ThreadedReply, depth: number) => {
        let current = comment;

        while (current.depth > depth) {
            const parentId = parentById.get(current.id);
            const parent = parentId ? byId.get(parentId) : null;

            if (!parent) {
                return current;
            }

            current = parent;
        }

        return current;
    };
    const getWindowForComment = (commentId: string, maxDepth: number) => {
        const targetComment = getReply(commentId);

        if (!targetComment || targetComment.depth <= maxDepth) {
            return null;
        }

        const focusDepth = Math.floor((targetComment.depth - 1) / maxDepth) * maxDepth;
        const focusedComment = getAncestorAtDepth(targetComment, focusDepth);

        return {
            topLevelComment: rootComment,
            focusedComment,
            backComment: focusedComment
        };
    };

    return {
        rootComment,
        roots,
        getWindowForComment
    };
}

export function buildThreadedReplies(threadParentComment: Comment): ThreadedReply[] {
    return buildThreadGraph(threadParentComment).roots;
}

export function getFocusedThread(comments: Comment[], targetId: string | null, maxDepth: number): ThreadWindow | null {
    if (!targetId) {
        return null;
    }

    for (const topLevelComment of comments) {
        if (topLevelComment.id === targetId) {
            return null;
        }

        if (!topLevelComment.replies?.some(reply => reply.id === targetId)) {
            continue;
        }

        return buildThreadGraph(topLevelComment).getWindowForComment(targetId, maxDepth);
    }

    return null;
}
