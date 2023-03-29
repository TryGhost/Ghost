export class PaywallParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            paywall: () => ({
                conversion() {
                    const node = new self.NodeClass();
                    return {node};
                },
                priority: 0
            })
        };
    }
}
