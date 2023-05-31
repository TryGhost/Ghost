import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ProductParser} from './ProductParser';
import {renderProductNodeToDOM} from './ProductRenderer';

export const INSERT_PRODUCT_COMMAND = createCommand();
const NODE_TYPE = 'product';

export class ProductNode extends KoenigDecoratorNode {
    // payload properties
    __productImageSrc;
    __productImageWidth;
    __productImageHeight;
    __productTitle;
    __productDescription;
    __productRatingEnabled;
    __productStarRating;
    __productButtonEnabled;
    __productButton;
    __productUrl;

    static getType() {
        return NODE_TYPE;
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    static get urlTransformMap() {
        return {
            productImageSrc: 'url',
            productTitle: 'html',
            productDescription: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            productImageSrc: self.__productImageSrc,
            productImageWidth: self.__productImageWidth,
            productImageHeight: self.__productImageHeight,
            productTitle: self.__productTitle,
            productDescription: self.__productDescription,
            productRatingEnabled: self.__productRatingEnabled,
            productStarRating: self.__productStarRating,
            productButtonEnabled: self.__productButtonEnabled,
            productButton: self.__productButton,
            productUrl: self.__productUrl
        };
    }

    constructor({productImageSrc, productImageWidth, productImageHeight, productTitle, productDescription, productRatingEnabled, productStarRating, productButtonEnabled, productButton, productUrl} = {}, key) {
        super(key);
        this.__productImageSrc = productImageSrc || '';
        this.__productImageWidth = productImageWidth || null;
        this.__productImageHeight = productImageHeight || null;
        this.__productTitle = productTitle || '';
        this.__productDescription = productDescription || '';
        this.__productRatingEnabled = !!productRatingEnabled;
        this.__productStarRating = productStarRating || 5;
        this.__productButtonEnabled = !!productButtonEnabled;
        this.__productButton = productButton || '';
        this.__productUrl = productUrl || '';
    }

    static importJSON(serializedNode) {
        const {productImageSrc, productImageWidth, productImageHeight, productTitle, productDescription, productRatingEnabled, productStarRating, productButtonEnabled, productButton, productUrl} = serializedNode;
        const node = new this({
            productImageSrc,
            productImageWidth,
            productImageHeight,
            productTitle,
            productDescription,
            productRatingEnabled,
            productStarRating,
            productButtonEnabled,
            productButton,
            productUrl
        });
        return node;
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getProductImageSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            productImageSrc: isBlob ? '<base64String>' : this.getProductImageSrc(),
            productImageWidth: this.getProductImageWidth(),
            productImageHeight: this.getProductImageHeight(),
            productTitle: this.getProductTitle(),
            productDescription: this.getProductDescription(),
            productRatingEnabled: this.getProductRatingEnabled(),
            productStarRating: this.getProductStarRating(),
            productButtonEnabled: this.getProductButtonEnabled(),
            productButton: this.getProductButton(),
            productUrl: this.getProductUrl()

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

    getProductImageSrc() {
        const self = this.getLatest();
        return self.__productImageSrc;
    }

    setProductImageSrc(productImageSrc) {
        const writable = this.getWritable();
        return writable.__productImageSrc = productImageSrc;
    }

    getProductImageWidth() {
        const self = this.getLatest();
        return self.__productImageWidth;
    }

    setProductImageWidth(productImageWidth) {
        const writable = this.getWritable();
        return writable.__productImageWidth = productImageWidth;
    }

    getProductImageHeight() {
        const self = this.getLatest();
        return self.__productImageHeight;
    }

    setProductImageHeight(productImageHeight) {
        const writable = this.getWritable();
        return writable.__productImageHeight = productImageHeight;
    }

    getProductTitle() {
        const self = this.getLatest();
        return self.__productTitle;
    }

    setProductTitle(title) {
        const writable = this.getWritable();
        return writable.__productTitle = title;
    }

    getProductDescription() {
        const self = this.getLatest();
        return self.__productDescription;
    }

    setProductDescription(description) {
        const writable = this.getWritable();
        return writable.__productDescription = description;
    }

    getProductRatingEnabled() {
        const self = this.getLatest();
        return self.__productRatingEnabled;
    }

    setProductRatingEnabled(productRatingEnabled) {
        const writable = this.getWritable();
        return writable.__productRatingEnabled = productRatingEnabled;
    }

    getProductStarRating() {
        const self = this.getLatest();
        return self.__productStarRating;
    }

    setProductStarRating(starRating) {
        const writable = this.getWritable();
        return writable.__productStarRating = starRating;
    }

    getProductButtonEnabled() {
        const self = this.getLatest();
        return self.__productButtonEnabled;
    }

    setProductButtonEnabled(productButtonEnabled) {
        const writable = this.getWritable();
        return writable.__productButtonEnabled = productButtonEnabled;
    }

    getProductButton() {
        const self = this.getLatest();
        return self.__productButton;
    }

    setProductButton(productButton) {
        const writable = this.getWritable();
        return writable.__productButton = productButton;
    }

    getProductUrl() {
        const self = this.getLatest();
        return self.__productUrl;
    }

    setProductUrl(productUrl) {
        const writable = this.getWritable();
        return writable.__productUrl = productUrl;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        const isButtonFilled = this.__productButtonEnabled && this.__productUrl && this.__productButton;
        return !this.__productTitle && !this.__productDescription && !isButtonFilled && !this.__productImageSrc && !this.__productRatingEnabled;
    }
}

export const $createProductNode = (dataset) => {
    return new ProductNode(dataset);
};

export function $isProductNode(node) {
    return node instanceof ProductNode;
}
