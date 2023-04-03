export class PaywallParser {
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
                        if (isCommentNode && domNode.nodeValue.trim() === 'members-only') {
                            const node = new self.NodeClass();
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
