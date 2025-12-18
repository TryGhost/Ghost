import {useMemo} from 'react';
import type {Comment} from '@tryghost/admin-x-framework/api/comments';

export function useKnownFilterValues({comments}: { comments: Comment[] }) {
    return useMemo(() => {
        const posts = new Map<string, { id: string; title: string }>();
        const members = new Map<
            string,
            { id: string; name: string; email: string }
        >();
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
        }
        return {
            knownPosts: Array.from(posts.values()),
            knownMembers: Array.from(members.values())
        };
    }, [comments]);
}
