import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ImageParser} from './ImageParser';
import {renderImageNodeToDOM} from './ImageRenderer';

export const INSERT_IMAGE_COMMAND = createCommand();
export const UPLOAD_IMAGE_COMMAND = createCommand();

export class ImageNode extends KoenigDecoratorNode {
    // payload properties
    __src;
    __caption;
    __title;
    __altText;
    __cardWidth;
    __width;
    __height;

    static getType() {
        return 'image';
    }

    static clone(node) {
        return new ImageNode(
            node.getDataset(),
            node.__key
        );
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            src: 'url',
            caption: 'html'
        };
    }

    getDataset() {
        return {
            src: this.__src,
            caption: this.__caption,
            title: this.__title,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
            cardWidth: this.__cardWidth
        };
    }

    // from https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/components/gh-image-uploader.js#L18
    static extensionTypes = ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'];
    static mimeTypes = ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];

    constructor({src, caption, title, altText, cardWidth, width, height} = {}, key) {
        super(key);
        this.__src = src || '';
        this.__title = title || '';
        this.__caption = caption || '';
        this.__altText = altText || '';
        this.__width = width || null;
        this.__height = height || null;
        this.__cardWidth = cardWidth || 'regular';
    }

    static importJSON(serializedNode) {
        const {src, caption, title, altText, width, height, cardWidth} = serializedNode;
        const node = $createImageNode({
            src,
            caption,
            title,
            altText,
            width,
            height,
            cardWidth
        });
        return node;
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            type: 'image',
            src: isBlob ? '<base64String>' : this.getSrc(),
            width: this.getImgWidth(),
            height: this.getImgHeight(),
            title: this.getTitle(),
            altText: this.getAltText(),
            caption: this.getCaption(),
            cardWidth: this.getCardWidth()
        };
        return dataset;
    }

    static importDOM() {
        const parser = new ImageParser($createImageNode);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderImageNodeToDOM(this, options);
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
        return this.__src;
    }

    setSrc(src) {
        const writable = this.getWritable();
        return writable.__src = src;
    }

    getTitle() {
        return this.__title;
    }

    setTitle(title) {
        const writable = this.getWritable();
        return writable.__title = title;
    }

    setCardWidth(cardWidth) {
        const writable = this.getWritable();
        return writable.__cardWidth = cardWidth;
    }

    getCardWidth() {
        return this.__cardWidth;
    }

    getImgWidth() {
        return this.__width;
    }

    setImgWidth(width) {
        const writable = this.getWritable();
        return writable.__width = width;
    }

    getImgHeight() {
        return this.__height;
    }

    setImgHeight(height) {
        const writable = this.getWritable();
        return writable.__height = height;
    }

    getCaption() {
        return this.__caption;
    }

    setCaption(caption) {
        const writable = this.getWritable();
        return writable.__caption = caption;
    }

    getAltText() {
        return this.__altText;
    }

    setAltText(altText) {
        const writable = this.getWritable();
        return writable.__altText = altText;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }
}

export const $createImageNode = (dataset) => {
    return new ImageNode(dataset);
};

export function $isImageNode(node) {
    return node instanceof ImageNode;
}
