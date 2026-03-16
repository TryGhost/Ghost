import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

// https://github.com/TryGhost/Koenig/issues/1
// allows arbitrary HTML blocks wrapped in our card comments to be extracted
// into a HTML card rather than being put through the normal parse+plugins
export function fromKoenigCard(): ParserPlugin {
    return function kgHtmlCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 8 || node.nodeValue !== 'kg-card-begin: html') {
            return;
        }

        const html: string[] = [];

        function isHtmlEndComment(n: Node | null): boolean {
            return !!n && n.nodeType === 8 && n.nodeValue === 'kg-card-end: html';
        }

        let nextNode = node.nextSibling;
        while (nextNode && !isHtmlEndComment(nextNode)) {
            const currentNode = nextNode as Element;
            html.push(currentNode.outerHTML);
            nextNode = currentNode.nextSibling;
            // remove nodes as we go so that they don't go through the parser
            currentNode.remove();
        }

        const payload = {html: html.join('\n').trim()};
        const cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
