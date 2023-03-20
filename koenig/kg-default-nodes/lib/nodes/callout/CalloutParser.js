const getColorTag = (nodeElem) => {
    const colorClass = nodeElem.classList?.value?.match(/kg-callout-card-(\w+)/);
    return colorClass && colorClass[1];
};

export class CalloutParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            div: (nodeElem) => {
                const isKgCalloutCard = nodeElem.classList?.contains('kg-callout-card');
                if (nodeElem.tagName === 'DIV' && isKgCalloutCard) {
                    return {
                        conversion(domNode) {
                            const textNode = domNode?.querySelector('.kg-callout-text');
                            const emojiNode = domNode?.querySelector('.kg-callout-emoji');
                            const color = getColorTag(domNode);

                            const payload = {
                                text: textNode && textNode.innerHTML.trim(),
                                hasEmoji: emojiNode ? true : false,
                                emojiValue: emojiNode && emojiNode.innerHTML.trim(),
                                backgroundColor: color
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