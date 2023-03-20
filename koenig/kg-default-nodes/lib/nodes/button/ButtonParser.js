export class ButtonParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            div: (nodeElem) => {
                const isButtonCard = nodeElem.classList?.contains('kg-button-card');
                if (nodeElem.tagName === 'DIV' && isButtonCard) {
                    return {
                        conversion(domNode) {
                            const alignmentClass = nodeElem.className.match(/kg-align-(left|center)/);
                            
                            let alignment;
                            if (alignmentClass) {
                                alignment = alignmentClass[1];
                            }

                            const buttonNode = domNode?.querySelector('.kg-btn');
                            const href = buttonNode.href;
                            const title = buttonNode.textContent;

                            const payload = {
                                title: title,
                                alignment: alignment,
                                href: href
                            };

                            const node = new self.NodeClass(payload);
                            return {node};
                        },
                        priority: 1
                    };
                }
                return null;
            }
        };
    }
}
