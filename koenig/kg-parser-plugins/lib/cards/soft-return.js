export function fromBr() {
    // mobiledoc by default ignores <BR> tags but we have a custom SoftReturn atom
    return function fromBrToSoftReturnAtom(node, builder, {addMarkerable, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'BR') {
            return;
        }

        let softReturn = builder.createAtom('soft-return');
        addMarkerable(softReturn);

        nodeFinished();
    };
}
