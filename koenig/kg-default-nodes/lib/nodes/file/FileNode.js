/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderFileNode} from './file-renderer';
import {parseFileNode} from './file-parser';
import {bytesToSize} from '../../utils/size-byte-converter';

export class FileNode extends generateDecoratorNode({
    nodeType: 'file',
    properties: [
        {name: 'src', default: '', urlType: 'url'},
        {name: 'fileTitle', default: '', wordCount: true},
        {name: 'fileCaption', default: '', wordCount: true},
        {name: 'fileName', default: ''},
        {name: 'fileSize', default: ''}
    ],
    defaultRenderFn: renderFileNode
}) {
    /* @override */
    exportJSON() {
        const {src, fileTitle, fileCaption, fileName, fileSize} = this;
        const isBlob = src && src.startsWith('data:');

        return {
            type: 'file',
            src: isBlob ? '<base64String>' : src,
            fileTitle,
            fileCaption,
            fileName,
            fileSize
        };
    }

    static importDOM() {
        return parseFileNode(this);
    }

    get formattedFileSize() {
        return bytesToSize(this.fileSize);
    }
}

export function $isFileNode(node) {
    return node instanceof FileNode;
}

export const $createFileNode = (dataset) => {
    return new FileNode(dataset);
};
