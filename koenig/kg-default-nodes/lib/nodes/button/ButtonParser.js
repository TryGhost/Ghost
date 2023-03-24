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
                            const buttonUrl = buttonNode.href;
                            const buttonText = buttonNode.textContent;

                            const payload = {
                                buttonText: buttonText,
                                alignment: alignment,
                                buttonUrl: buttonUrl
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
