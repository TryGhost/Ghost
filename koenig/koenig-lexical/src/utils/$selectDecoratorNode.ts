import {
    $createNodeSelection,
    $setSelection
} from 'lexical';

export function $selectDecoratorNode(node) {
    const nodeSelection = $createNodeSelection();
    nodeSelection.add(node.getKey());
    $setSelection(nodeSelection);
}
