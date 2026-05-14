import CommentComponent from './comment';
import React from 'react';
import ReplyTree from './reply-tree';
import {FocusedThread as FocusedThreadData, buildCommentPermalink} from '../../utils/helpers';
import {useAppContext} from '../../app-context';
import {useNavActions} from '../../utils/nav-actions';

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
                <ReplyTree replies={focusedComment.nestedReplies} threadParentComment={topLevelComment} useThreading={true} />
            </CommentComponent>
        </div>
    );
};

export default FocusedThread;
