import {$isListNode, ListNode} from '@lexical/list';
import {LexicalEditor, LexicalNode} from 'lexical';

export function mergeListNodesTransform(node: LexicalNode) {
    const nextSibling = node.getNextSibling();

    if ($isListNode(nextSibling) && nextSibling.getListType() === node.getListType()) {
        node.append(...nextSibling.getChildren());
        nextSibling.remove();
    }
}

export function registerMergeListNodesTransform(editor: LexicalEditor) {
    if (editor.hasNodes([ListNode])) {
        return editor.registerNodeTransform(ListNode, mergeListNodesTransform);
    }

    return () => {};
}
