export function getEditorCardNodes(editor) {
    // TODO: open upstream PR to add public method of getting nodes
    const allNodes = editor._nodes;
    const cardNodes = [];

    for (const [nodeType, {klass}] of allNodes) {
        if (!klass.kgMenu) {
            continue;
        }

        cardNodes.push([nodeType, klass]);
    }

    return cardNodes;
}
