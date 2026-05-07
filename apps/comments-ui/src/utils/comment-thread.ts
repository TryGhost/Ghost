import {Comment} from '../app-context';

export type ThreadConnectorType = 'primary' | 'branch';

export type ThreadRenderItem = {
    comment: Comment;
    parentId: string;
    depth: number;
    isPrimary: boolean;
    isBranch: boolean;
    connector: {
        type: ThreadConnectorType;
        continues: boolean;
    };
};

export type CommentThreadNode = {
    comment: Comment;
    parentId: string;
    children: CommentThreadNode[];
    depth: number;
    descendantCount: number;
};

function getLikes(comment: Comment) {
    return comment.count?.likes || 0;
}

function getCreatedAt(comment: Comment) {
    const time = new Date(comment.created_at).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function compareNodes(a: CommentThreadNode, b: CommentThreadNode) {
    const likesDifference = getLikes(b.comment) - getLikes(a.comment);
    if (likesDifference !== 0) {
        return likesDifference;
    }

    const descendantDifference = b.descendantCount - a.descendantCount;
    if (descendantDifference !== 0) {
        return descendantDifference;
    }

    const createdAtDifference = getCreatedAt(a.comment) - getCreatedAt(b.comment);
    if (createdAtDifference !== 0) {
        return createdAtDifference;
    }

    return a.comment.id.localeCompare(b.comment.id);
}

function updateDescendantCounts(node: CommentThreadNode): number {
    node.descendantCount = node.children.reduce((total, child) => {
        return total + 1 + updateDescendantCounts(child);
    }, 0);

    return node.descendantCount;
}

function sortChildren(node: CommentThreadNode) {
    node.children.sort(compareNodes);
    node.children.forEach((child) => {
        child.depth = node.depth + 1;
        sortChildren(child);
    });
}

function canAttachToReply(node: CommentThreadNode | undefined) {
    return node?.comment.status === 'published';
}

function appendRenderItems(node: CommentThreadNode, parentIsPrimary: boolean, renderItems: ThreadRenderItem[]) {
    node.children.forEach((child, index) => {
        const isPrimary = parentIsPrimary && index === 0;

        renderItems.push({
            comment: child.comment,
            parentId: child.parentId,
            depth: child.depth,
            isPrimary,
            isBranch: !isPrimary,
            connector: {
                type: isPrimary ? 'primary' : 'branch',
                continues: child.children.length > 0
            }
        });

        appendRenderItems(child, isPrimary, renderItems);
    });
}

export function buildCommentThreadTree(rootComment: Comment): CommentThreadNode {
    const rootNode: CommentThreadNode = {
        comment: rootComment,
        parentId: rootComment.id,
        children: [],
        depth: 0,
        descendantCount: 0
    };
    const nodesById = new Map<string, CommentThreadNode>();

    (rootComment.replies || []).forEach((reply) => {
        nodesById.set(reply.id, {
            comment: reply,
            parentId: rootComment.id,
            children: [],
            depth: 1,
            descendantCount: 0
        });
    });

    nodesById.forEach((node) => {
        const parentNode = node.comment.in_reply_to_id
            ? nodesById.get(node.comment.in_reply_to_id)
            : undefined;

        if (canAttachToReply(parentNode)) {
            node.parentId = parentNode!.comment.id;
            parentNode!.children.push(node);
        } else {
            node.parentId = rootComment.id;
            rootNode.children.push(node);
        }
    });

    updateDescendantCounts(rootNode);
    sortChildren(rootNode);

    return rootNode;
}

export function buildCommentThread(rootComment: Comment): ThreadRenderItem[] {
    const rootNode = buildCommentThreadTree(rootComment);

    const renderItems: ThreadRenderItem[] = [];
    appendRenderItems(rootNode, true, renderItems);

    return renderItems;
}
