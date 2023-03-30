import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ProductParser} from './ProductParser';
import {renderProductNodeToDOM} from './ProductRenderer';

export const INSERT_PRODUCT_COMMAND = createCommand();
const NODE_TYPE = 'product';

export class ProductNode extends KoenigDecoratorNode {
    // payload properties
    __imgSrc;
    __imgWidth;
    __imgHeight;
    __title;
    __description;
    __isRatingEnabled;
    __starRating;
    __isButtonEnabled;
    __buttonText;
    __buttonUrl;

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
            imgSrc: 'url',
            title: 'html',
            description: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            imgSrc: self.__imgSrc,
            imgWidth: self.__imgWidth,
            imgHeight: self.__imgHeight,
            title: self.__title,
            description: self.__description,
            isRatingEnabled: self.__isRatingEnabled,
            starRating: self.__starRating,
            isButtonEnabled: self.__isButtonEnabled,
            buttonText: self.__buttonText,
            buttonUrl: self.__buttonUrl
        };
    }

    constructor({imgSrc, imgWidth, imgHeight, title, description, isRatingEnabled, starRating, isButtonEnabled, buttonText, buttonUrl} = {}, key) {
        super(key);
        this.__imgSrc = imgSrc || '';
        this.__imgWidth = imgWidth || null;
        this.__imgHeight = imgHeight || null;
        this.__title = title || '';
        this.__description = description || '';
        this.__isRatingEnabled = !!isRatingEnabled;
        this.__starRating = starRating || 5;
        this.__isButtonEnabled = !!isButtonEnabled;
        this.__buttonText = buttonText || '';
        this.__buttonUrl = buttonUrl || '';
    }

    static importJSON(serializedNode) {
        const {imgSrc, imgWidth, imgHeight, title, description, isRatingEnabled, starRating, isButtonEnabled, buttonText, buttonUrl} = serializedNode;
        const node = new this({
            imgSrc,
            imgWidth,
            imgHeight,
            title,
            description,
            isRatingEnabled,
            starRating,
            isButtonEnabled,
            buttonText,
            buttonUrl
        });
        return node;
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getImgSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            imgSrc: isBlob ? '<base64String>' : this.getImgSrc(),
            imgWidth: this.getImgWidth(),
            imgHeight: this.getImgHeight(),
            title: this.getTitle(),
            description: this.getDescription(),
            isRatingEnabled: this.getIsRatingEnabled(),
            starRating: this.getStarRating(),
            isButtonEnabled: this.getIsButtonEnabled(),
            buttonText: this.getButtonText(),
            buttonUrl: this.getButtonUrl()

        };
        return dataset;
    }

    static importDOM() {
        const parser = new ProductParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderProductNodeToDOM(this, options);
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

    getImgSrc() {
        const self = this.getLatest();
        return self.__imgSrc;
    }

    setImgSrc(imgSrc) {
        const writable = this.getWritable();
        return writable.__imgSrc = imgSrc;
    }

    getImgWidth() {
        const self = this.getLatest();
        return self.__imgWidth;
    }

    setImgWidth(imgWidth) {
        const writable = this.getWritable();
        return writable.__imgWidth = imgWidth;
    }

    getImgHeight() {
        const self = this.getLatest();
        return self.__imgHeight;
    }

    setImgHeight(imgHeight) {
        const writable = this.getWritable();
        return writable.__imgHeight = imgHeight;
    }

    getTitle() {
        const self = this.getLatest();
        return self.__title;
    }

    setTitle(title) {
        const writable = this.getWritable();
        return writable.__title = title;
    }

    getDescription() {
        const self = this.getLatest();
        return self.__description;
    }

    setDescription(description) {
        const writable = this.getWritable();
        return writable.__description = description;
    }

    getIsRatingEnabled() {
        const self = this.getLatest();
        return self.__isRatingEnabled;
    }

    setIsRatingEnabled(isRatingEnabled) {
        const writable = this.getWritable();
        return writable.__isRatingEnabled = isRatingEnabled;
    }

    getStarRating() {
        const self = this.getLatest();
        return self.__starRating;
    }

    setStarRating(starRating) {
        const writable = this.getWritable();
        return writable.__starRating = starRating;
    }

    getIsButtonEnabled() {
        const self = this.getLatest();
        return self.__isButtonEnabled;
    }

    setIsButtonEnabled(isButtonEnabled) {
        const writable = this.getWritable();
        return writable.__isButtonEnabled = isButtonEnabled;
    }

    getButtonText() {
        const self = this.getLatest();
        return self.__buttonText;
    }

    setButtonText(buttonText) {
        const writable = this.getWritable();
        return writable.__buttonText = buttonText;
    }

    getButtonUrl() {
        const self = this.getLatest();
        return self.__buttonUrl;
    }

    setButtonUrl(buttonUrl) {
        const writable = this.getWritable();
        return writable.__buttonUrl = buttonUrl;
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
        const isButtonFilled = this.__isButtonEnabled && this.__buttonUrl && this.__buttonText;
        return !this.__title && !this.__description && !isButtonFilled && !this.__imgSrc && !this.__isRatingEnabled;
    }
}

export const $createProductNode = (dataset) => {
    return new ProductNode(dataset);
};

export function $isProductNode(node) {
    return node instanceof ProductNode;
}
