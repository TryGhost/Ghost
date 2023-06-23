export function parsePaywallNode(PaywallNode) {
    return {
        '#comment': () => {
            return {
                conversion(domNode) {
                    const isCommentNode = domNode.nodeType === 8;
                    if (isCommentNode && domNode.nodeValue.trim() === 'members-only') {
                        const node = new PaywallNode();
                        return {node};
                    }

                    return null;
                },
                priority: 0
            };
        }
    };
}
