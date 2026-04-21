import React, {useMemo} from 'react';
import {Comment, useAppContext} from '../../app-context';
import {CommentComponent} from './comment';
import {TreeComment, buildReplyTree} from '../../utils/helpers';

function findInTree(tree: TreeComment[], id: string): TreeComment | undefined {
    for (const node of tree) {
        if (node.id === id) {
            return node;
        }
        const found = findInTree(node.children, id);
        if (found) {
            return found;
        }
    }
    return undefined;
}

/**
 * Find the direct parent node of a target in the tree.
 */
function findParentInTree(tree: TreeComment[], targetId: string): TreeComment | undefined {
    for (const node of tree) {
        for (const child of node.children) {
            if (child.id === targetId) {
                return node;
            }
        }
        const found = findParentInTree(node.children, targetId);
        if (found) {
            return found;
        }
    }
    return undefined;
}

function flattenTreeToReplies(children: TreeComment[]): Comment[] {
    const result: Comment[] = [];
    for (const child of children) {
        result.push(child);
        result.push(...flattenTreeToReplies(child.children));
    }
    return result;
}

type Props = {
    comments: Comment[];
    focusedThreadId: string;
};

const FocusedThread: React.FC<Props> = ({comments, focusedThreadId}) => {
    const {dispatchAction, t} = useAppContext();

    const {focusedNode, parentNodeId} = useMemo(() => {
        for (const topLevel of comments) {
            if (topLevel.id === focusedThreadId) {
                return {focusedNode: {...topLevel, children: []} as TreeComment, parentNodeId: null};
            }

            const reply = topLevel.replies?.find(r => r.id === focusedThreadId);
            if (reply) {
                const tree = buildReplyTree(topLevel);
                const node = findInTree(tree, focusedThreadId);
                if (node) {
                    const parentNode = findParentInTree(tree, focusedThreadId);
                    return {
                        focusedNode: node,
                        parentNodeId: parentNode?.id ?? topLevel.id
                    };
                }
            }
        }
        return {focusedNode: null, parentNodeId: null};
    }, [comments, focusedThreadId]);

    if (!focusedNode) {
        return (
            <div className="py-4">
                <button
                    className="font-sans text-sm font-medium text-neutral-900/60 transition-colors hover:text-neutral-900 dark:text-white/50 dark:hover:text-white/80"
                    type="button"
                    onClick={() => dispatchAction('unfocusThread', undefined)}
                >
                    &larr; {t('Back')}
                </button>
            </div>
        );
    }

    const focusedAsRoot: Comment = {
        ...focusedNode,
        replies: flattenTreeToReplies(focusedNode.children),
        count: {
            ...focusedNode.count,
            replies: flattenTreeToReplies(focusedNode.children).length
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <button
                    className="font-sans text-[1.3rem] font-medium text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                    data-testid="back-to-parent"
                    type="button"
                    onClick={() => {
                        if (parentNodeId) {
                            const isTopLevel = comments.some(c => c.id === parentNodeId);
                            if (isTopLevel) {
                                dispatchAction('unfocusThread', undefined);
                                dispatchAction('highlightComment', {commentId: parentNodeId});
                                dispatchAction('setScrollTarget', parentNodeId);
                            } else {
                                dispatchAction('focusThread', parentNodeId);
                            }
                        } else {
                            dispatchAction('unfocusThread', undefined);
                        }
                    }}
                >
                    &larr; {t('Back')}
                </button>
                <button
                    className="font-sans text-[1.3rem] font-medium text-neutral-900/55 transition-colors hover:text-neutral-900/80 dark:text-white/45 dark:hover:text-white/70"
                    data-testid="see-full-discussion"
                    type="button"
                    onClick={() => dispatchAction('unfocusThread', undefined)}
                >
                    {t('See full discussion')}
                </button>
            </div>

            <CommentComponent comment={focusedAsRoot} />
        </div>
    );
};

export default FocusedThread;
