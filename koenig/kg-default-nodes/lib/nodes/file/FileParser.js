export class FileParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            div: (nodeElem) => {
                const isKgFileCard = nodeElem.classList?.contains('kg-file-card');
                if (nodeElem.tagName === 'DIV' && isKgFileCard) {
                    return {
                        conversion(domNode) {
                            const link = domNode.querySelector('a');
                            const src = link.getAttribute('href');
                            const title = domNode.querySelector('.kg-file-card-title')?.textContent || '';
                            const description = domNode.querySelector('.kg-file-card-caption')?.textContent || '';
                            const fileName = domNode.querySelector('.kg-file-card-filename')?.textContent || '';
                            let fileSize = domNode.querySelector('.kg-file-card-filesize')?.textContent || '';
                            const payload = {
                                src,
                                title,
                                description,
                                fileName,
                                fileSize
                            };

                            const node = new self.NodeClass(payload);
                            return {node};
                        },
                        priority: 1
                    };
                }
                return null;
            }
        };
    }
}
