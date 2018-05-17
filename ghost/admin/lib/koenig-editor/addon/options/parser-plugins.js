// mobiledoc by default ignores <BR> tags but we have a custom SoftReturn atom
export function brToSoftBreakAtom(node, builder, {addMarkerable, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'BR') {
        return;
    }

    let softReturn = builder.createAtom('soft-return');
    addMarkerable(softReturn);

    nodeFinished();
}

// leading newlines in text nodes will add a space to the beginning of the text
// which doesn't render correctly if we're replacing <br> with SoftReturn atoms
// after parsing text as markdown to html
export function removeLeadingNewline(node) {
    if (node.nodeType !== 3 || node.nodeName !== '#text') {
        return;
    }

    node.nodeValue = node.nodeValue.replace(/^\n/, '');
}

export default [
    brToSoftBreakAtom,
    removeLeadingNewline,
];
