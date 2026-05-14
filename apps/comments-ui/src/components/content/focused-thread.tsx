import CommentComponent from './comment';
import React, {useCallback} from 'react';
import ReplyTree from './reply-tree';
import {ThreadWindow} from '../../utils/thread-graph';
import {buildCommentPermalink, buildCommentsRootPermalink} from '../../utils/helpers';
import {useAppContext} from '../../app-context';
import {useNavActions} from '../../utils/nav-actions';

type FocusedThreadProps = {
    focusedThread: ThreadWindow;
};

const FocusedThread: React.FC<FocusedThreadProps> = ({focusedThread}) => {
    const {pageUrl, t} = useAppContext();
    const {navigateBackToParent} = useNavActions();
    const {backComment, focusedComment, topLevelComment} = focusedThread;
    const backPermalink = buildCommentPermalink(pageUrl, backComment.id);
    const handleBackClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        navigateBackToParent(backComment.id, backPermalink);
    }, [backComment.id, backPermalink, navigateBackToParent]);

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <a
                    className="font-sans text-[1.3rem] font-medium text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                    data-testid="back-to-parent"
                    href={backPermalink}
                    target="_parent"
                    onClick={handleBackClick}
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
