export class AsideParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            aside: () => ({
                conversion() {
                    const node = new self.NodeClass();
                    return {node};
                },
                priority: 0
            })
        };
    }
}
