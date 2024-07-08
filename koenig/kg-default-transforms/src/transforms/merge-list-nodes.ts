import {$isListNode, ListNode} from '@lexical/list';
import {LexicalEditor} from 'lexical';

export function mergeListNodesTransform(node: ListNode) {
    const nextSibling = node.getNextSibling();

    if ($isListNode(nextSibling) && $isListNode(node) && nextSibling.getListType() === node.getListType()) {
        node.append(...nextSibling.getChildren());
        nextSibling.remove();
    }
}

export function registerMergeListNodesTransform(editor: LexicalEditor) {
    if (editor.hasNodes([ListNode])) {
        return editor.registerNodeTransform(ListNode, mergeListNodesTransform);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
}
