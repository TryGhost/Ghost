export class ImageParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            img: () => ({
                conversion(domNode) {
                    if (domNode.tagName === 'IMG') {
                        const {alt: altText, src, title, width, height} = domNode;
                        const node = new self.NodeClass({altText, src, title, width, height});
                        return {node};
                    }

                    return null;
                },
                priority: 1
            })
            // TODO: add <figure> and other handling from kg-parser-plugins
        };
    }
}
