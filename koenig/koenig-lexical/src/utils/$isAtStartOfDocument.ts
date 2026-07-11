import {$isListItemNode} from '@lexical/list';
import {$isTextNode} from 'lexical';

export function $isAtStartOfDocument(selection) {
    let [selectedNode] = selection.getNodes();
    
    if ($isTextNode(selectedNode)) {
        selectedNode = selectedNode.getParent();
    }

    let selectedTopLevelElement = selectedNode.getTopLevelElement();

    // handle nested lists, where parent for a text node is not enough
    if ($isListItemNode(selectedNode) && selectedTopLevelElement !== selectedNode.getParent()) {
        return false;
    }

    const selectedIndex = selectedNode.getIndexWithinParent();
    const selectedTopLevelIndex = selectedTopLevelElement ? selectedTopLevelElement.getIndexWithinParent() : undefined;

    return selectedIndex === 0
        && selectedTopLevelIndex === 0
        && selection.anchor.offset === 0
        && selection.focus.offset === 0;
}
