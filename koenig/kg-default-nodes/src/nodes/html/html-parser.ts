export function parseHtmlNode(HtmlNode) {
    return {
        '#comment': (nodeElem) => {
            if (nodeElem.nodeType === 8 && nodeElem.nodeValue.trim().match(/^kg-card-begin:\s?html$/)) {
                return {
                    conversion(domNode) {
                        let html = [];
                        let nextNode = domNode.nextSibling;

                        while (nextNode && !isHtmlEndComment(nextNode)) {
                            let currentNode = nextNode;
                            html.push(currentNode.outerHTML);
                            nextNode = currentNode.nextSibling;
                            // remove nodes as we go so that they don't go through the parser
                            currentNode.remove();
                        }

                        let payload = {html: html.join('\n').trim()};
                        const node = new HtmlNode(payload);
                        return {node};
                    },
                    priority: 0
                };
            }

            return null;
        },
        table: (nodeElem) => {
            if (nodeElem.nodeType === 1 && nodeElem.tagName === 'TABLE' && nodeElem.parentNode.tagName !== 'TABLE') {
                return {
                    conversion(domNode) {
                        const payload = {html: domNode.outerHTML};
                        const node = new HtmlNode(payload);
                        return {node};
                    },
                    priority: 0
                };
            }

            return null;
        }
    };
}

function isHtmlEndComment(node) {
    return node && node.nodeType === 8 && node.nodeValue.trim().match(/^kg-card-end:\s?html$/);
}
