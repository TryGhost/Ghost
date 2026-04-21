import React, {useMemo, useRef, useState} from 'react';
import RepliesPagination from './replies-pagination';
import {Comment, useAppContext} from '../../app-context';
import {CommentComponent} from './comment';
import {TreeComment, buildReplyTree, countDescendants} from '../../utils/helpers';

const INITIAL_REPLIES_SHOWN = 3;
const MAX_NESTING_DEPTH = 3;

const TreeNode: React.FC<{
    node: TreeComment;
    rootComment: Comment;
    depth: number;
}> = ({node, rootComment, depth}) => {
    const {dispatchAction, t} = useAppContext();
    const hasChildren = node.children.length > 0;
    const atMaxDepth = depth >= MAX_NESTING_DEPTH;

    let childElements: React.ReactNode;

    if (hasChildren && !atMaxDepth) {
        childElements = node.children.map(child => (
            <TreeNode
                key={child.id}
                depth={depth + 1}
                node={child}
                rootComment={rootComment}
            />
        ));
    } else if (hasChildren && atMaxDepth) {
        const descendantCount = countDescendants(node);
        childElements = (
            <button
                className="mb-4 flex items-center gap-1.5 px-0 font-sans text-[1.3rem] font-semibold text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                data-testid="continue-thread-button"
                type="button"
                onClick={() => dispatchAction('focusThread', node.id)}
            >
                <span>
                    {descendantCount === 1
                        ? t('1 more reply')
                        : t('{amount} more replies', {amount: descendantCount})
                    } &rsaquo;
                </span>
            </button>
        );
    }

    return (
        <CommentComponent
            comment={node}
            hasTreeChildren={hasChildren}
            parent={rootComment}
            treeChildren={childElements}
            treeChildrenCompact={hasChildren && atMaxDepth}
        />
    );
};

export type ThreadedRepliesProps = {
    comment: Comment;
};

const ThreadedReplies: React.FC<ThreadedRepliesProps> = ({comment}) => {
    const {dispatchAction, commentIdToScrollTo} = useAppContext();
    const initialReplyIds = useRef(new Set(comment.replies.map(reply => reply.id)));

    const replyTree = useMemo(() => buildReplyTree(comment), [comment]);

    const [showAll, setShowAll] = useState(() => {
        return !!commentIdToScrollTo
            && comment.replies.slice(INITIAL_REPLIES_SHOWN).some(reply => reply.id === commentIdToScrollTo);
    });

    const hasNewReplies = comment.replies.some(reply => !initialReplyIds.current.has(reply.id));
    const expanded = showAll || hasNewReplies;

    const serverHasMore = comment.count.replies > comment.replies.length;

    const visibleTree = expanded ? replyTree : replyTree.slice(0, INITIAL_REPLIES_SHOWN);
    const clientHiddenCount = replyTree.length - visibleTree.length;
    const totalHiddenCount = serverHasMore
        ? comment.count.replies - comment.replies.length + clientHiddenCount
        : clientHiddenCount;

    const loadMore = () => {
        if (serverHasMore) {
            dispatchAction('loadMoreReplies', {comment, limit: 'all'});
        }
        setShowAll(true);
    };

    return (
        <div>
            {visibleTree.map(node => (
                <TreeNode
                    key={node.id}
                    depth={1}
                    node={node}
                    rootComment={comment}
                />
            ))}
            {totalHiddenCount > 0 && <RepliesPagination count={totalHiddenCount} loadMore={loadMore} />}
        </div>
    );
};

export default ThreadedReplies;
