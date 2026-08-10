import type {LexicalNode} from 'lexical';

export function parsePaywallNode(PaywallNode: new (data?: Record<string, unknown>) => LexicalNode) {
    return {
        '#comment': (nodeElem: Node) => {
            if (nodeElem.nodeType === 8 && nodeElem.nodeValue?.trim() === 'members-only') {
                return {
                    conversion() {
                        const node = new PaywallNode();
                        return {node};
                    },
                    priority: 0 as const
                };
            }
            return null;
        }
    };
}
