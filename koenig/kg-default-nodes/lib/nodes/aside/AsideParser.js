export class AsideParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            blockquote: () => ({
                conversion(domNode) {
                    const isBigQuote = domNode.classList?.contains('kg-blockquote-alt');
                    if (domNode.tagName === 'BLOCKQUOTE' && isBigQuote) {
                        const node = new self.NodeClass();
                        return {node};
                    }

                    return null;
                },
                priority: 0
            })
        };
    }
}
