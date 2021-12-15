function transformSizeToBytes(sizeStr = '') {
    if (!sizeStr) {
        return 0;
    }
    const [sizeVal, sizeType] = sizeStr.split(' ');
    if (!sizeVal || !sizeType) {
        return 0;
    }
    if (sizeType === 'Bytes') {
        return Number(sizeVal);
    } else if (sizeType === 'KB') {
        return Number(sizeVal) * 2048;
    } else if (sizeType === 'MB') {
        return Number(sizeVal) * 2048 * 2048;
    }
}

export function fromKoenigCard() {
    return function kgFileCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-file-card')) {
            return;
        }

        const titleNode = node.querySelector('.kg-file-card-title');
        const captionNode = node.querySelector('.kg-file-card-caption');
        const fileNameNode = node.querySelector('.kg-file-card-filename');
        const fileSizeNode = node.querySelector('.kg-file-card-filesize');
        const fileCardLinkNode = node.querySelector('.kg-file-card-container');
        const title = titleNode && titleNode.innerHTML.trim();
        const caption = captionNode && captionNode.innerHTML.trim();
        const fileName = fileNameNode && fileNameNode.innerHTML.trim();
        const fileSizeStr = fileSizeNode && fileSizeNode.innerHTML.trim();
        const fileSrc = fileCardLinkNode && fileCardLinkNode.href;

        if (!fileSrc) {
            return;
        }

        const payload = {
            src: fileSrc,
            fileTitle: title,
            fileCaption: caption,
            fileSize: transformSizeToBytes(fileSizeStr),
            fileName: fileName
        };

        const cardSection = builder.createCardSection('file', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
