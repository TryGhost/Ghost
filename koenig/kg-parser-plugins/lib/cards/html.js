// https://github.com/TryGhost/Koenig/issues/1
// allows arbitrary HTML blocks wrapped in our card comments to be extracted
// into a HTML card rather than being put through the normal parse+plugins
export function fromKoenigCard() {
    return function kgHtmlCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 8 || node.nodeValue !== 'kg-card-begin: html') {
            return;
        }

        let html = [];

        function isHtmlEndComment(n) {
            return n && n.nodeType === 8 && n.nodeValue === 'kg-card-end: html';
        }

        let nextNode = node.nextSibling;
        while (nextNode && !isHtmlEndComment(nextNode)) {
            let currentNode = nextNode;
            html.push(currentNode.outerHTML);
            nextNode = currentNode.nextSibling;
            // remove nodes as we go so that they don't go through the parser
            currentNode.remove();
        }

        let payload = {html: html.join('\n').trim()};
        let cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
