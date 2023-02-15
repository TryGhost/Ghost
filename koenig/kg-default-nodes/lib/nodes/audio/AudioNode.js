import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {AudioParser} from './AudioParser';
import {renderAudioNodeToDOM} from './AudioRenderer';

export const INSERT_AUDIO_COMMAND = createCommand();
const NODE_TYPE = 'audio';

export class AudioNode extends KoenigDecoratorNode {
    // payload properties
    __src;
    __title;
    __duration;
    __mimeType;
    __thumbnailSrc;

    static getType() {
        return NODE_TYPE;
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            src: 'url'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            src: self.__src,
            title: self.__title,
            duration: self.__duration,
            mimeType: self.__mimeType,
            thumbnailSrc: self.__thumbnailSrc
        };
    }

    constructor({src, title, duration, thumbnailSrc, mimeType} = {}, key) {
        super(key);
        this.__src = src || '';
        this.__title = title || '';
        this.__duration = duration || 0;
        this.__mimeType = mimeType || '';
        this.__thumbnailSrc = thumbnailSrc || '';
    }

    static importJSON(serializedNode) {
        const {src, title, duration, mimeType, thumbnailSrc} = serializedNode;
        const node = new this({
            src,
            title,
            mimeType,
            duration,
            thumbnailSrc
        });
        return node;
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            src: isBlob ? '<base64String>' : this.getSrc(),
            title: this.getTitle(),
            mimeType: this.getMimeType(),
            duration: this.getDuration(),
            thumbnailSrc: this.getThumbnailSrc()
        };
        return dataset;
    }

    static importDOM() {
        const parser = new AudioParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderAudioNodeToDOM(this, options);
        return {element};
    }

    /* c8 ignore start */
    createDOM() {
        const element = document.createElement('div');
        return element;
    }

    updateDOM() {
        return false;
    }

    isInline() {
        return false;
    }
    /* c8 ignore stop */

    getSrc() {
        const self = this.getLatest();
        return self.__src;
    }

    setSrc(src) {
        const writable = this.getWritable();
        return writable.__src = src;
    }

    getTitle() {
        const self = this.getLatest();
        return self.__title;
    }

    setTitle(title) {
        const writable = this.getWritable();
        return writable.__title = title;
    }

    getDuration() {
        const self = this.getLatest();
        return self.__duration;
    }

    setDuration(duration) {
        const writable = this.getWritable();
        return writable.__duration = duration;
    }

    getMimeType() {
        const self = this.getLatest();
        return self.__mimeType;
    }

    setMimeType(mimeType) {
        const writable = this.getWritable();
        return writable.__mimeType = mimeType;
    }

    getThumbnailSrc() {
        const self = this.getLatest();
        return self.__thumbnailSrc;
    }

    setThumbnailSrc(thumbnailSrc) {
        const writable = this.getWritable();
        return writable.__thumbnailSrc = thumbnailSrc;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__src;
    }
}

export const $createAudioNode = (dataset) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node) {
    return node instanceof AudioNode;
}
