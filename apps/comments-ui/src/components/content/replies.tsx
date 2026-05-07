import CommentComponent, {CommentLayoutVariant} from './comment';
import RepliesPagination from './replies-pagination';
import {type CSSProperties, Fragment, useEffect, useMemo, useRef, useState} from 'react';
import {ReactComponent as ChevronIcon} from '../../images/icons/chevron-down.svg';
import {Comment, useAppContext} from '../../app-context';
import {CommentThreadNode, buildCommentThreadTree} from '../../utils/comment-thread';
import {formatNumber} from '../../utils/helpers';

const INITIAL_REPLIES_SHOWN = 3;

export type RepliesProps = {
    comment: Comment;
    rootConnectorLineStyle?: CSSProperties;
};

type ThreadedReplyProps = {
    node: CommentThreadNode;
    rootComment: Comment;
    layoutVariant: CommentLayoutVariant;
    showBranchStub: boolean;
};

const ThreadedReply: React.FC<ThreadedReplyProps> = ({node, rootComment, layoutVariant, showBranchStub}) => {
    const showRepliesLine = node.children.length > 0;
    const branchLineClassName = 'absolute -left-3 top-4 h-px w-2.5 rounded bg-neutral-900/15 dark:bg-white/20 sm:-left-4 sm:w-3';

    return (
        <div
            className="relative"
            data-testid={`thread-${showBranchStub ? 'branch' : 'primary'}-connector`}
            data-thread-depth={node.depth}
            data-thread-parent-id={node.parentId}
        >
            {showBranchStub && (
                <div
                    className={branchLineClassName}
                    data-testid="thread-branch-line"
                />
            )}
            <CommentComponent
                comment={node.comment}
                hasThreadChildren={node.children.length > 0}
                hideConnectedReplySnippet={node.parentId !== rootComment.id}
                layoutVariant={layoutVariant}
                parent={rootComment}
                renderReplies={false}
                showRepliesLine={showRepliesLine}
            />
        </div>
    );
};

type BranchToggleButtonProps = {
    count: number;
    expanded: boolean;
    onToggle: () => void;
};

const BranchToggleButton: React.FC<BranchToggleButtonProps> = ({count, expanded, onToggle}) => {
    const {t} = useAppContext();
    const label = expanded
        ? t('Hide')
        : count === 1
            ? t('1 other reply')
            : t('{amount} other replies', {amount: formatNumber(count)});

    return (
        <button
            aria-expanded={expanded}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-neutral-900/10 bg-transparent px-3 py-1 text-left font-sans text-sm font-medium leading-snug text-neutral-500 transition-colors hover:border-neutral-900/20 hover:text-neutral-800 dark:border-white/15 dark:text-neutral-300 dark:hover:border-white/25 dark:hover:text-white"
            data-testid="thread-branch-toggle"
            type="button"
            onClick={onToggle}
        >
            <ChevronIcon className={`size-3 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
            <span className="truncate">{label}</span>
        </button>
    );
};

type HiddenThreadGroupProps = {
    anchorNode: CommentThreadNode;
    nodes: CommentThreadNode[];
    expandedNodes: CommentThreadNode[];
    onCollapse: (branchIds: string[]) => void;
    onExpand: (branchIds: string[]) => void;
    renderNode: (node: CommentThreadNode, options: RenderNodeOptions) => React.ReactNode;
    showMainlineContinuation: boolean;
};

const HiddenThreadGroup: React.FC<HiddenThreadGroupProps> = ({anchorNode, nodes, expandedNodes, onCollapse, onExpand, renderNode, showMainlineContinuation}) => {
    const branchIds = nodes.map(node => node.comment.id);
    const expanded = expandedNodes.length > 0;
    const toggleBranches = () => {
        if (expanded) {
            onCollapse(branchIds);
        } else {
            onExpand(branchIds);
        }
    };

    return (
        <div
            className="relative mb-5 mt-1"
            data-testid="thread-hidden-group"
            data-thread-depth={anchorNode.depth + 1}
            data-thread-parent-id={anchorNode.comment.id}
        >
            {showMainlineContinuation && (
                <div
                    className="absolute -top-5 bottom-[-0.75rem] left-4 w-px rounded bg-neutral-900/15 dark:bg-white/20"
                    data-testid="thread-mainline-continuation"
                />
            )}
            <div
                className="absolute left-4 top-4 h-px w-9 rounded bg-neutral-900/15 dark:bg-white/20"
                data-testid="thread-branch-line"
            />
            {expandedNodes.length > 0 && (
                <div
                    className="absolute bottom-8 left-12 top-4 w-px rounded bg-gradient-to-b from-neutral-900/15 from-80% to-transparent dark:from-white/20 dark:from-80%"
                    data-testid="thread-hidden-group-line"
                />
            )}
            <div className="relative z-[1] ml-[52px]">
                <BranchToggleButton count={nodes.length} expanded={expanded} onToggle={toggleBranches} />
            </div>
            {expanded && (
                <div className="ml-8 mt-4">
                    {expandedNodes.map(node => renderNode(node, {
                        collapseSideBranches: false,
                        showBranchStub: false
                    }))}
                </div>
            )}
        </div>
    );
};

function collectExpandedBranchIds(rootNode: CommentThreadNode, targetId: string): Set<string> {
    const expandedIds = new Set<string>();

    const visit = (node: CommentThreadNode) => {
        for (const [index, child] of node.children.entries()) {
            if (child.comment.id === targetId || visit(child)) {
                if (index > 0) {
                    expandedIds.add(child.comment.id);
                }
                return true;
            }
        }

        return false;
    };

    visit(rootNode);

    return expandedIds;
}

function getVisibleReplyCount(nodes: CommentThreadNode[]) {
    return nodes.reduce((total, node) => total + 1 + node.descendantCount, 0);
}

type RenderNodeOptions = {
    collapseSideBranches?: boolean;
    showBranchStub: boolean;
};

const Replies: React.FC<RepliesProps> = ({comment, rootConnectorLineStyle}) => {
    const {dispatchAction, commentIdToScrollTo} = useAppContext();
    const initialReplyIds = useRef(new Set(comment.replies.map(reply => reply.id)));
    const threadRoot = useMemo(() => buildCommentThreadTree(comment), [comment]);

    const [showAll, setShowAll] = useState(() => {
        return !!commentIdToScrollTo
            && comment.replies.slice(INITIAL_REPLIES_SHOWN).some(reply => reply.id === commentIdToScrollTo);
    });
    const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());

    const hasNewReplies = comment.replies.some(reply => !initialReplyIds.current.has(reply.id));
    const expanded = showAll || hasNewReplies;

    useEffect(() => {
        if (!commentIdToScrollTo) {
            return;
        }

        const nextExpandedIds = collectExpandedBranchIds(threadRoot, commentIdToScrollTo);
        if (nextExpandedIds.size === 0) {
            return;
        }

        setExpandedBranchIds((currentExpandedIds) => {
            const mergedExpandedIds = new Set(currentExpandedIds);
            nextExpandedIds.forEach(id => mergedExpandedIds.add(id));
            return mergedExpandedIds;
        });
    }, [commentIdToScrollTo, threadRoot]);

    // The API may return fewer replies than count.replies (e.g. old API with LIMIT 3).
    // When that happens, "Show more" fetches the rest from the server first.
    const serverHasMore = comment.count.replies > comment.replies.length;
    const visibleRootBranches = expanded ? threadRoot.children : threadRoot.children.slice(0, INITIAL_REPLIES_SHOWN);
    const totalHiddenCount = Math.max(comment.count.replies - getVisibleReplyCount(visibleRootBranches), 0);

    const loadMore = () => {
        if (serverHasMore) {
            dispatchAction('loadMoreReplies', {comment, limit: 'all'});
        }
        setShowAll(true);
    };

    const expandBranches = (branchIds: string[]) => {
        setExpandedBranchIds((currentExpandedIds) => {
            const nextExpandedIds = new Set(currentExpandedIds);
            branchIds.forEach(id => nextExpandedIds.add(id));
            return nextExpandedIds;
        });
    };

    const collapseBranches = (branchIds: string[]) => {
        setExpandedBranchIds((currentExpandedIds) => {
            const nextExpandedIds = new Set(currentExpandedIds);
            branchIds.forEach(id => nextExpandedIds.delete(id));
            return nextExpandedIds;
        });
    };

    const renderNode = (node: CommentThreadNode, options: RenderNodeOptions): React.ReactNode => {
        const {showBranchStub} = options;
        const collapseSideBranches = options.collapseSideBranches ?? true;
        const isNestedBranch = showBranchStub && node.depth > 1;
        const isCollapsedBranch = collapseSideBranches && isNestedBranch && !expandedBranchIds.has(node.comment.id);
        const layoutVariant: CommentLayoutVariant = node.depth > 1 ? 'compact-thread' : 'default';
        const primaryChild = node.children[0];
        const branchChildren = node.children.slice(1);
        const hiddenBranchChildren = branchChildren.filter(branchChild => branchChild.depth > 1);
        const expandedHiddenBranchChildren = hiddenBranchChildren.filter(branchChild => expandedBranchIds.has(branchChild.comment.id));
        const visibleBranchChildren = branchChildren.filter(branchChild => !hiddenBranchChildren.includes(branchChild));
        const childOptions = {
            collapseSideBranches
        };

        if (isCollapsedBranch) {
            return (
                <BranchToggleButton
                    key={node.comment.id}
                    count={1}
                    expanded={false}
                    onToggle={() => expandBranches([node.comment.id])}
                />
            );
        }

        const nodeContent = (
            <>
                <ThreadedReply layoutVariant={layoutVariant} node={node} rootComment={comment} showBranchStub={showBranchStub} />
                {hiddenBranchChildren.length > 0 && (
                    <HiddenThreadGroup
                        anchorNode={node}
                        expandedNodes={expandedHiddenBranchChildren}
                        nodes={hiddenBranchChildren}
                        renderNode={renderNode}
                        showMainlineContinuation={Boolean(primaryChild || visibleBranchChildren.length > 0)}
                        onCollapse={collapseBranches}
                        onExpand={expandBranches}
                    />
                )}
                {primaryChild ? renderNode(primaryChild, {...childOptions, showBranchStub: false}) : null}
                {visibleBranchChildren.map(branchChild => renderNode(branchChild, {...childOptions, showBranchStub: true}))}
            </>
        );

        return (
            <Fragment key={node.comment.id}>
                {nodeContent}
            </Fragment>
        );
    };

    const renderNodes = (nodes: CommentThreadNode[]) => {
        return nodes.map((node, index) => renderNode(node, {showBranchStub: index > 0}));
    };

    return (
        <div className="relative">
            {visibleRootBranches.length > 0 && (
                <div
                    className={`absolute left-4 w-px rounded bg-neutral-900/15 dark:bg-white/20 ${rootConnectorLineStyle ? '' : '-top-6 h-6'}`}
                    data-testid="thread-root-start-line"
                    style={rootConnectorLineStyle}
                />
            )}
            {renderNodes(visibleRootBranches)}
            {totalHiddenCount > 0 && <RepliesPagination count={totalHiddenCount} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
