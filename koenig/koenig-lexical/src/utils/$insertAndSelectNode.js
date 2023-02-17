import {
    $createNodeSelection,
    $setSelection,
    $isParagraphNode,
    $createParagraphNode
} from 'lexical';

export const $insertAndSelectNode = ({selectedNode, newNode}) => {
    const selectedIsParagraph = $isParagraphNode(selectedNode);
    const selectedIsEmpty = selectedNode.getTextContent() === '';

    selectedNode
        .getTopLevelElementOrThrow()
        .insertAfter(newNode);

    if (selectedIsParagraph && selectedIsEmpty) {
        selectedNode.remove();
    }

    const nodeSelection = $createNodeSelection();
    nodeSelection.add(newNode.getKey());
    $setSelection(nodeSelection);

    // always follow the inserted card with a blank paragraph when inserting at end of document
    if (!newNode.getNextSibling()) {
        const paragraph = $createParagraphNode();
        newNode.getTopLevelElementOrThrow().insertAfter(paragraph);
    }
};
