import {useMemo} from 'react';
import type {Comment} from '@tryghost/admin-x-framework/api/comments';

export function useKnownFilterValues({comments}: { comments: Comment[] }) {
    return useMemo(() => {
        const posts = new Map<string, { id: string; title: string }>();
        const members = new Map<
            string,
            { id: string; name?: string; email?: string }
        >();
        // Track thread parents (for filtering by parent_id)
        const threads = new Map<string, { id: string; snippet: string }>();
        // Track reply-to targets (for filtering by in_reply_to_id)
        const replyTos = new Map<string, { id: string; snippet: string }>();

        for (const comment of comments) {
            if (comment.post?.id && comment.post?.title) {
                posts.set(comment.post.id, {
                    id: comment.post.id,
                    title: comment.post.title
                });
            }
            if (comment.member?.id) {
                members.set(comment.member.id, {
                    id: comment.member.id,
                    name: comment.member.name,
                    email: comment.member.email
                });
            }

            // Track reply-to targets (comments that have been specifically replied to)
            if (comment.in_reply_to_id && comment.in_reply_to_snippet) {
                if (!replyTos.has(comment.in_reply_to_id)) {
                    replyTos.set(comment.in_reply_to_id, {
                        id: comment.in_reply_to_id,
                        snippet: comment.in_reply_to_snippet
                    });
                }
            } else if (comment.parent_id && comment.in_reply_to_snippet) {
                if (!threads.has(comment.parent_id)) {
                    threads.set(comment.parent_id, {
                        id: comment.parent_id,
                        snippet: comment.in_reply_to_snippet
                    });
                }
            }
        }
        return {
            knownPosts: Array.from(posts.values()),
            knownMembers: Array.from(members.values()),
            knownThreads: Array.from(threads.values()),
            knownReplyTos: Array.from(replyTos.values())
        };
    }, [comments]);
}
