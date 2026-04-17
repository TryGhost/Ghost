export function parsePaywallNode(PaywallNode) {
    return {
        '#comment': (nodeElem) => {
            if (nodeElem.nodeType === 8 && nodeElem.nodeValue.trim() === 'members-only') {
                return {
                    conversion() {
                        const node = new PaywallNode();
                        return {node};
                    },
                    priority: 0
                };
            }
            return null;
        }
    };
}
