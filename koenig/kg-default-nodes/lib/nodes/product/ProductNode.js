/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseProductNode} from './product-parser';
import {renderProductNode} from './product-renderer';

export class ProductNode extends generateDecoratorNode({nodeType: 'product',
    properties: [
        {name: 'productImageSrc', default: '', urlType: 'url'},
        {name: 'productImageWidth', default: null},
        {name: 'productImageHeight', default: null},
        {name: 'productTitle', default: '', urlType: 'html', wordCount: true},
        {name: 'productDescription', default: '', urlType: 'html', wordCount: true},
        {name: 'productRatingEnabled', default: false},
        {name: 'productStarRating', default: 5},
        {name: 'productButtonEnabled', default: false},
        {name: 'productButton', default: ''},
        {name: 'productUrl', default: ''}
    ]}
) {
    /* override */
    exportJSON() {
        // checks if src is a data string
        const {productImageSrc, productImageWidth, productImageHeight, productTitle, productDescription, productRatingEnabled, productStarRating, productButtonEnabled, productButton, productUrl} = this;
        const isBlob = productImageSrc.startsWith('data:');

        const dataset = {
            type: 'product',
            version: 1,
            productImageSrc: isBlob ? '<base64String>' : productImageSrc,
            productImageWidth,
            productImageHeight,
            productTitle,
            productDescription,
            productRatingEnabled,
            productStarRating,
            productButtonEnabled,
            productButton,
            productUrl

        };
        return dataset;
    }

    static importDOM() {
        return parseProductNode(this);
    }

    exportDOM(options = {}) {
        return renderProductNode(this, options);
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
