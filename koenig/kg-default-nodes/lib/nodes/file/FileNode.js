import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderFileNodeToDOM} from './FileRenderer';
import {FileParser} from './FileParser';
import {createCommand} from 'lexical';

export const INSERT_FILE_COMMAND = createCommand();

export function bytesToSize(bytes) {
    if (!bytes) {
        return '0 Byte';
    }
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
        return '0 Byte';
    }
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i))) + ' ' + sizes[i];
}

export class FileNode extends KoenigDecoratorNode {
    // payload properties
    __src;
    __fileTitle;
    __fileCaption;
    __fileName;
    __fileSize;

    static getType() {
        return 'file';
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    static get urlTransformMap() {
        return {
            src: 'url'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            src: self.__src,
            fileTitle: self.__fileTitle,
            fileCaption: self.__fileCaption,
            fileName: self.__fileName,
            fileSize: self.__fileSize
        };
    }

    constructor({src, fileTitle, fileCaption, fileName, fileSize} = {}, key) {
        super(key);
        this.__src = src || '';
        this.__fileTitle = fileTitle || '';
        this.__fileCaption = fileCaption || '';
        this.__fileName = fileName || '';
        this.__fileSize = fileSize || '';
    }

    static importJSON(serializedNode) {
        const {src, fileTitle, fileCaption, fileName, fileSize} = serializedNode;

        return new this({
            src,
            fileTitle,
            fileCaption,
            fileName,
            fileSize
        });
    }

    exportJSON() {
        const src = this.getSrc();
        const isBlob = src.startsWith('data:');
        return {
            type: this.getType(),
            src: isBlob ? '<base64String>' : this.getSrc(),
            fileTitle: this.getFileTitle(),
            fileCaption: this.getFileCaption(),
            fileName: this.getFileName(),
            fileSize: this.getFileSize()
        };
    }

    static importDOM() {
        const parser = new FileParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderFileNodeToDOM(this, options);
        return {element};
    }

    getSrc() {
        const self = this.getLatest();
        return self.__src;
    }

    setSrc(src) {
        const writable = this.getWritable();
        writable.__src = src;
    }

    getFileTitle() {
        const self = this.getLatest();
        return self.__fileTitle;
    }

    setFileTitle(fileTitle) {
        const writable = this.getWritable();
        writable.__fileTitle = fileTitle;
    }

    getFileCaption() {
        const self = this.getLatest();
        return self.__fileCaption;
    }

    setFileCaption(fileCaption) {
        const writable = this.getWritable();
        writable.__fileCaption = fileCaption;
    }

    getFileName() {
        const self = this.getLatest();
        return self.__fileName;
    }

    setFileName(fileName) {
        const writable = this.getWritable();
        writable.__fileName = fileName;
    }

    getFileSize() {
        const self = this.getLatest();
        return self.__fileSize;
    }

    setFileSize(size) {
        const writable = this.getWritable();
        writable.__fileSize = size;
    }

    getFormattedFileSize() {
        const self = this.getLatest();
        return bytesToSize(self.__fileSize);
    }

    hasEditMode() {
        return true;
    }
}

export function $isFileNode(node) {
    return node instanceof FileNode;
}

export const $createFileNode = (dataset) => {
    return new FileNode(dataset);
};

