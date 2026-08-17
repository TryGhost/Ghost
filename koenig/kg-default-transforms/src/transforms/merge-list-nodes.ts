/* c8 ignore start */
import {$isListNode, ListNode} from '@lexical/list';
import type {LexicalEditor} from 'lexical';
/* c8 ignore stop */

/* c8 ignore next */
export function mergeListNodesTransform(node: ListNode) {
    const nextSibling = node.getNextSibling();

    if ($isListNode(nextSibling) && $isListNode(node) && nextSibling.getListType() === node.getListType()) {
        node.append(...nextSibling.getChildren());
        nextSibling.remove();
    }
}

/* c8 ignore next */
export function registerMergeListNodesTransform(editor: LexicalEditor) {
    if (editor.hasNodes([ListNode])) {
        return editor.registerNodeTransform(ListNode, mergeListNodesTransform);
    }

    return () => {};
}
