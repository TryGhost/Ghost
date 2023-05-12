function sizeToBytes(size) {
    if (!size) {
        return 0;
    }
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const sizeParts = size.split(' ');
    const sizeNumber = parseFloat(sizeParts[0]);
    const sizeUnit = sizeParts[1];
    const sizeUnitIndex = sizes.indexOf(sizeUnit);
    if (sizeUnitIndex === -1) {
        return 0;
    }
    return Math.round(sizeNumber * Math.pow(1024, sizeUnitIndex));
}
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
                            const fileTitle = domNode.querySelector('.kg-file-card-title')?.textContent || '';
                            const fileCaption = domNode.querySelector('.kg-file-card-caption')?.textContent || '';
                            const fileName = domNode.querySelector('.kg-file-card-filename')?.textContent || '';
                            let fileSize = sizeToBytes(domNode.querySelector('.kg-file-card-filesize')?.textContent || '');
                            const payload = {
                                src,
                                fileTitle,
                                fileCaption,
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
