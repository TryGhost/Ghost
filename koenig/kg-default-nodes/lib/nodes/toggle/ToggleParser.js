export class ToggleParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            div: () => ({
                conversion(domNode) {
                    const isKgToggleCard = domNode.classList?.contains('kg-toggle-card');
                    if (domNode.tagName === 'DIV' && isKgToggleCard) {
                        const headingNode = domNode.querySelector('.kg-toggle-heading-text');
                        const heading = headingNode.textContent;

                        const contentNode = domNode.querySelector('.kg-toggle-content');
                        const content = contentNode.textContent;

                        const payload = {
                            heading,
                            content
                        };

                        const node = new self.NodeClass(payload);
                        return {node};
                    }

                    return null;
                },
                priority: 1
            })
        };
    }
}