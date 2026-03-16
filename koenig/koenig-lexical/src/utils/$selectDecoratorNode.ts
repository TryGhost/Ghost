import {
    $createNodeSelection,
    $setSelection
} from 'lexical';
import type {LexicalNode} from 'lexical';

export function $selectDecoratorNode(node: LexicalNode): void {
    const nodeSelection = $createNodeSelection();
    nodeSelection.add(node.getKey());
    $setSelection(nodeSelection);
}
