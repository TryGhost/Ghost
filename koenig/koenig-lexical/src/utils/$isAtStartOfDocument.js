import {$isTextNode} from 'lexical';

export function $isAtStartOfDocument(selection) {
    let [selectedNode] = selection.getNodes();
    if ($isTextNode(selectedNode)) {
        selectedNode = selectedNode.getParent();
    }
    const selectedIndex = selectedNode.getIndexWithinParent();
    const selectedTopLevelIndex = selectedNode.getTopLevelElement()?.getIndexWithinParent();

    return selectedIndex === 0
        && selectedTopLevelIndex === 0
        && selection.anchor.offset === 0
        && selection.focus.offset === 0;
}
