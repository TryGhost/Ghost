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

export function imgToCard(node, builder, {addSection, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'IMG') {
        return;
    }

    let payload = {src: node.src};
    let cardSection = builder.createCardSection('image', payload);
    addSection(cardSection);
    nodeFinished();
}

export function hrToCard(node, builder, {addSection, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'HR') {
        return;
    }

    let cardSection = builder.createCardSection('hr');
    addSection(cardSection);
    nodeFinished();
}

export function preCodeToCard(node, builder, {addSection, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'PRE') {
        return;
    }

    let [codeElement] = node.children;

    if (codeElement && codeElement.tagName === 'CODE') {
        let payload = {code: codeElement.textContent};
        let cardSection = builder.createCardSection('code', payload);
        addSection(cardSection);
        nodeFinished();
    }
}

export default [
    brToSoftBreakAtom,
    removeLeadingNewline,
    imgToCard,
    hrToCard,
    preCodeToCard
];
