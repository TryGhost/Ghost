import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

function transformSizeToBytes(sizeStr = ''): number {
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

    return 0;
}

export function fromKoenigCard(): ParserPlugin {
    return function kgFileCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-file-card')) {
            return;
        }

        const el = node as Element;
        const titleNode = el.querySelector('.kg-file-card-title');
        const captionNode = el.querySelector('.kg-file-card-caption');
        const fileNameNode = el.querySelector('.kg-file-card-filename');
        const fileSizeNode = el.querySelector('.kg-file-card-filesize');
        const fileCardLinkNode = el.querySelector('.kg-file-card-container') as HTMLAnchorElement | null;

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
            fileSize: transformSizeToBytes(fileSizeStr || ''),
            fileName: fileName
        };

        const cardSection = builder.createCardSection('file', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
