import type {LexicalNode} from 'lexical';

export function parseHorizontalRuleNode(HorizontalRuleNode: new (data?: Record<string, unknown>) => LexicalNode) {
    return {
        hr: () => ({
            conversion() {
                const node = new HorizontalRuleNode();
                return {node};
            },
            priority: 0 as const
        })
    };
}
