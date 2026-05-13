import CommentComponent from './comment';
import React from 'react';
import {Comment, useAppContext} from '../../app-context';
import {FocusedThread as FocusedThreadData, ThreadedReply, buildCommentPermalink} from '../../utils/helpers';
import {useNavActions} from '../../utils/nav-actions';
import {useThreadingContext} from '../../utils/threading-context';

function buildCommentsRootPermalink(pageUrl: string) {
    return `${pageUrl.replace(/#.*$/, '')}#ghost-comments`;
}

type FocusedThreadProps = {
    focusedThread: FocusedThreadData;
};

const FocusedThread: React.FC<FocusedThreadProps> = ({focusedThread}) => {
    const {dispatchAction, pageUrl, t} = useAppContext();
    const {requestInstantScroll} = useNavActions();
    const {backComment, focusedComment, topLevelComment} = focusedThread;
    const backPermalink = buildCommentPermalink(pageUrl, backComment.id);

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <a
                    className="font-sans text-[1.3rem] font-medium text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                    data-testid="back-to-parent"
                    href={backPermalink}
                    target="_parent"
                    onClick={(event) => {
                        event.preventDefault();
                        requestInstantScroll(backComment.id);
                        window.parent.history.pushState(null, '', backPermalink);
                        dispatchAction('setHashCommentId', backComment.id);
                        dispatchAction('setScrollTarget', null);
                        dispatchAction('setHighlightComment', null);
                    }}
                >
                    &larr; {t('Back')}
                </a>
                <a
                    className="font-sans text-[1.3rem] font-medium text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                    data-testid="see-full-discussion"
                    href={buildCommentsRootPermalink(pageUrl)}
                    target="_parent"
                >
                    {t('See full discussion')}
                </a>
            </div>

            <CommentComponent comment={focusedComment} parent={topLevelComment} useThreading={true}>
                {focusedComment.nestedReplies.map(reply => (
                    <FocusedThreadReply
                        key={reply.id}
                        depth={1}
                        reply={reply}
                        threadParentComment={topLevelComment}
                    />
                ))}
            </CommentComponent>
        </div>
    );
};

const FocusedThreadReply: React.FC<{
    reply: ThreadedReply;
    threadParentComment: Comment;
    depth: number;
}> = ({reply, threadParentComment, depth}) => {
    const {pageUrl, t} = useAppContext();
    const {requestFocusedThreadView} = useNavActions();
    const {maxThreadDepth} = useThreadingContext();
    const hasNestedReplies = reply.nestedReplies.length > 0;
    const atMaxDepth = depth >= maxThreadDepth;
    const nextReply = reply.nestedReplies[0];

    let nestedReplies: React.ReactNode = null;

    if (hasNestedReplies && !atMaxDepth) {
        nestedReplies = reply.nestedReplies.map(childReply => (
            <FocusedThreadReply
                key={childReply.id}
                depth={depth + 1}
                reply={childReply}
                threadParentComment={threadParentComment}
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
        <CommentComponent comment={reply} parent={threadParentComment} useThreading={true}>
            {nestedReplies}
        </CommentComponent>
    );
};

export default FocusedThread;
