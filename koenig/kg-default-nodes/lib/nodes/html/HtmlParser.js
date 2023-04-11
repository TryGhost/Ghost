export class HtmlParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            '#comment': () => {
                return {
                    conversion(domNode) {
                        const isCommentNode = domNode.nodeType === 8;
                        if (isCommentNode && domNode.nodeValue.trim() === 'kg-card-begin: html') {
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
                            const node = new self.NodeClass(payload);
                            return {node};
                        }

                        return null;
                    },
                    priority: 0
                };
            }
        };
    }
}

function isHtmlEndComment(node) {
    return node && node.nodeType === 8 && node.nodeValue === 'kg-card-end: html';
}