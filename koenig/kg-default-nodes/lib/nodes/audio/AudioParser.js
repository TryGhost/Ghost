// WIP
export class AudioParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            audio: () => ({
                conversion(domNode) {
                    if (domNode.tagName === 'AUDIO') {
                        const {src} = domNode;
                        const node = new self.NodeClass({src});
                        return {node};
                    }

                    return null;
                },
                priority: 1
            })
        };
    }
}
