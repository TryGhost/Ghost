export class HorizontalRuleParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            hr: () => ({
                conversion() {
                    const node = new self.NodeClass();
                    return {node};
                },
                priority: 0
            })
        };
    }
}
