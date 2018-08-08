export function removeBR(node, builder, {addMarkerable, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'BR') {
        return;
    }

    addMarkerable(builder.createMarker(' '));
    nodeFinished();
}

export default [
    removeBR
];
