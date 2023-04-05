import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {EmbedParser} from './EmbedParser';
import {renderEmbedNodeToDOM} from './EmbedRenderer';

export const INSERT_EMBED_COMMAND = createCommand();

export class EmbedNode extends KoenigDecoratorNode {
    // payload properties
    __url;
    __embedType;
    __html;
    __metadata;
    __caption;

    static getType() {
        return 'embed';
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
            url: 'url'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            url: self.__url,
            embedType: self.__embedType,
            html: self.__html,
            metadata: self.__metadata,
            caption: self.__caption
        };
    }

    constructor({url, embedType, html, metadata, caption} = {}, key) {
        super(key);
        this.__url = url || '';
        this.__embedType = embedType || '';
        this.__html = html || '';
        this.__metadata = metadata || {};
        this.__caption = caption || '';
    }

    static importJSON(serializedNode) {
        const {url, embedType, html, metadata, caption} = serializedNode;
        const node = new this({
            url,
            embedType,
            html,
            metadata,
            caption
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: 'embed',
            version: 1,
            url: this.getUrl(),
            embedType: this.getEmbedType(),
            html: this.getHtml(),
            metadata: this.getMetadata(),
            caption: this.getCaption()
        };
        return dataset;
    }

    // parser used when pasting html >> node
    static importDOM() {
        const parser = new EmbedParser(this);
        return parser.DOMConversionMap;
    }

    // renderer used when copying node >> html
    exportDOM(options = {}) {
        const element = renderEmbedNodeToDOM(this, options);
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

    getUrl() {
        const self = this.getLatest();
        return self.__url;
    }

    setUrl(url) {
        const writable = this.getWritable();
        return writable.__url = url;
    }

    getEmbedType() {
        const self = this.getLatest();
        return self.__embedType;
    }

    setEmbedType(type) {
        const writable = this.getWritable();
        return writable.__embedType = type;
    }

    getHtml() {
        const self = this.getLatest();
        return self.__html;
    }

    setHtml(html) {
        const writable = this.getWritable();
        return writable.__html = html;
    }

    getMetadata() {
        const self = this.getLatest();
        return self.__metadata;
    }

    setMetadata(metadata) {
        const writable = this.getWritable();
        return writable.__metadata = metadata;
    }

    getCaption() {
        const self = this.getLatest();
        return self.__caption;
    }

    setCaption(caption) {
        const writable = this.getWritable();
        return writable.__caption = caption;
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
        return !this.__url;
    }
}

export const $createEmbedNode = (dataset) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node) {
    return node instanceof EmbedNode;
}
