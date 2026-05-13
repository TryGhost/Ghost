import CommentComponent from './comment';
import React, {useEffect, useMemo, useRef} from 'react';
import {Comment, useAppContext} from '../../app-context';
import {ThreadedReply, buildCommentPermalink, buildThreadedReplies} from '../../utils/helpers';
import {useNavActions} from '../../utils/nav-actions';
import {useThreadingContext} from '../../utils/threading-context';

const NestedReply: React.FC<{
    reply: ThreadedReply;
    threadParentComment: Comment;
    useThreading: boolean;
    depth?: number;
}> = ({reply, threadParentComment, useThreading, depth = 1}) => {
    const {pageUrl, t} = useAppContext();
    const {requestFocusedThreadView} = useNavActions();
    const {maxThreadDepth} = useThreadingContext();
    const hasNestedReplies = reply.nestedReplies.length > 0;
    const atMaxDepth = depth >= maxThreadDepth;
    const nextReply = reply.nestedReplies[0];
    let nestedReplies: React.ReactNode = null;

    if (hasNestedReplies && !atMaxDepth) {
        nestedReplies = reply.nestedReplies.map(childReply => (
            <NestedReply
                key={childReply.id}
                depth={depth + 1}
                reply={childReply}
                threadParentComment={threadParentComment}
                useThreading={useThreading}
            />
        ));
    } else if (hasNestedReplies && atMaxDepth) {
        nestedReplies = (
            <a
                className="mb-4 flex items-center gap-1.5 px-0 font-sans text-[1.3rem] font-semibold text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                data-testid="continue-thread-button"
                href={buildCommentPermalink(pageUrl, nextReply.id)}
                target="_parent"
                onClick={() => requestFocusedThreadView(nextReply.id)}
            >
                <span>{t('Read more replies')} &rsaquo;</span>
            </a>
        );
    }

    return (
        <CommentComponent
            comment={reply}
            parent={threadParentComment}
            useThreading={useThreading}
        >
            {nestedReplies}
        </CommentComponent>
    );
};

export type ThreadedRepliesProps = {
    comment: Comment;
    useThreading: boolean;
};

const ThreadedReplies: React.FC<ThreadedRepliesProps> = ({comment, useThreading}) => {
    const {dispatchAction} = useAppContext();
    const requestedAllRepliesKey = useRef<string | null>(null);
    const previousComment = useRef<Comment | null>(null);
    const loadedReplies = comment.replies ?? [];
    const totalReplies = comment.count.total_replies ?? comment.count.replies;
    const serverHasMore = totalReplies > loadedReplies.length;
    const loadRequestKey = `${comment.id}:${loadedReplies.map(reply => reply.id).join(',')}`;

    useEffect(() => {
        if (previousComment.current !== comment) {
            requestedAllRepliesKey.current = null;
            previousComment.current = comment;
        }

        if (!serverHasMore) {
            requestedAllRepliesKey.current = null;
            return;
        }

        if (requestedAllRepliesKey.current === loadRequestKey) {
            return;
        }

        requestedAllRepliesKey.current = loadRequestKey;
        dispatchAction('loadMoreReplies', {comment, limit: 'all'});
    }, [comment, dispatchAction, loadRequestKey, serverHasMore]);

    const threadedReplies = useMemo(() => buildThreadedReplies(comment), [comment]);

    return (
        <div>
            {threadedReplies.map(reply => (
                <NestedReply
                    key={reply.id}
                    reply={reply}
                    threadParentComment={comment}
                    useThreading={useThreading}
                />
            ))}
        </div>
    );
};

export default ThreadedReplies;
