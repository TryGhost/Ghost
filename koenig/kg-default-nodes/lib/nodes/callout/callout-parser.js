const getColorTag = (nodeElem) => {
    const colorClass = nodeElem.classList?.value?.match(/kg-callout-card-(\w+)/);
    return colorClass && colorClass[1];
};

export function parseCalloutNode(CalloutNode) {
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
                            calloutText: textNode && textNode.innerHTML.trim(),
                            calloutEmoji: emojiNode && emojiNode.innerHTML.trim() || '',
                            backgroundColor: color
                        };

                        const node = new CalloutNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}