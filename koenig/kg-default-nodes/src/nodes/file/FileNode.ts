import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderFileNode} from './file-renderer.js';
import {parseFileNode} from './file-parser.js';
import {bytesToSize} from '../../utils/size-byte-converter.js';

const fileProperties = {
    src: {default: '', urlType: 'url'},
    fileTitle: {default: '', wordCount: true},
    fileCaption: {default: '', wordCount: true},
    fileName: {default: ''},
    fileSize: {default: 0}
} satisfies DecoratorNodePropertyMap;

export type FileData = DecoratorNodeData<typeof fileProperties>;

export class FileNode extends generateDecoratorNode({
    nodeType: 'file',
    properties: fileProperties,
    defaultRenderFn: renderFileNode
}) {
    /* @override */
    exportJSON() {
        const {src, fileTitle, fileCaption, fileName, fileSize} = this;
        const isBlob = src && src.startsWith('data:');

        return {
            type: 'file' as const,
            version: 1,
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

export function $isFileNode(node: unknown): node is FileNode {
    return node instanceof FileNode;
}

export const $createFileNode = (dataset: FileData = {}) => {
    return new FileNode(dataset);
};
