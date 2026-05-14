import CommentComponent from './comment';
import React from 'react';
import {Comment, useAppContext} from '../../app-context';
import {ThreadedReply} from '../../utils/thread-graph';
import {buildCommentPermalink} from '../../utils/helpers';
import {useNavActions} from '../../utils/nav-actions';
import {useThreadingContext} from '../../utils/threading-context';

const ReplyTreeNode: React.FC<{
    reply: ThreadedReply;
    threadParentComment: Comment;
    useThreading: boolean;
    depth: number;
}> = ({reply, threadParentComment, useThreading, depth}) => {
    const {pageUrl, t} = useAppContext();
    const {requestFocusedThreadView} = useNavActions();
    const {maxThreadDepth} = useThreadingContext();
    const hasNestedReplies = reply.nestedReplies.length > 0;
    const atMaxDepth = depth >= maxThreadDepth;
    const nextReply = reply.nestedReplies[0];
    let nestedReplies: React.ReactNode = null;

    if (hasNestedReplies && !atMaxDepth) {
        nestedReplies = reply.nestedReplies.map(childReply => (
            <ReplyTreeNode
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
        <CommentComponent comment={reply} parent={threadParentComment} useThreading={useThreading}>
            {nestedReplies}
        </CommentComponent>
    );
};

const ReplyTree: React.FC<{
    replies: ThreadedReply[];
    threadParentComment: Comment;
    useThreading: boolean;
    startDepth?: number;
}> = ({replies, threadParentComment, useThreading, startDepth = 1}) => {
    return (
        <>
            {replies.map(reply => (
                <ReplyTreeNode
                    key={reply.id}
                    depth={startDepth}
                    reply={reply}
                    threadParentComment={threadParentComment}
                    useThreading={useThreading}
                />
            ))}
        </>
    );
};

export default ReplyTree;
