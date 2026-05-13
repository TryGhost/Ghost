import CommentComponent from './comment';
import React, {useEffect, useMemo, useRef} from 'react';
import {Comment, useAppContext} from '../../app-context';
import {ThreadedReply, buildThreadedReplies} from '../../utils/helpers';

const NestedReply: React.FC<{
    reply: ThreadedReply;
    threadParentComment: Comment;
    useThreading: boolean;
}> = ({reply, threadParentComment, useThreading}) => {
    const nestedReplies = reply.nestedReplies.map(childReply => (
        <NestedReply
            key={childReply.id}
            reply={childReply}
            threadParentComment={threadParentComment}
            useThreading={useThreading}
        />
    ));

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
