import {
    $createNodeSelection,
    $createParagraphNode,
    $isParagraphNode,
    $setSelection
} from 'lexical';

export const $insertAndSelectNode = ({selectedNode, newNode}) => {
    const selectedIsParagraph = $isParagraphNode(selectedNode);
    const selectedIsEmpty = selectedNode.getTextContent() === '';

    selectedNode
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
        newNode.insertAfter(paragraph);
    }
};
