export function parseHorizontalRuleNode(HorizontalRuleNode) {
    return {
        hr: () => ({
            conversion() {
                const node = new HorizontalRuleNode();
                return {node};
            },
            priority: 0
        })
    };
}
