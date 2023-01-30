// WIP
export class VideoParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            video: () => ({
                conversion(domNode) {
                    if (domNode.tagName === 'VIDEO') {
                        const {src, width, height} = domNode;
                        const node = new self.NodeClass({src, width, height});
                        return {node};
                    }

                    return null;
                },
                priority: 1
            })
        };
    }
}
