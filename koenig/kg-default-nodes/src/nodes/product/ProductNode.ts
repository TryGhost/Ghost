import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseProductNode} from './product-parser.js';
import {renderProductNode} from './product-renderer.js';

const productProperties = [
    {name: 'productImageSrc', default: '', urlType: 'url'},
    {name: 'productImageWidth', default: null as number | null},
    {name: 'productImageHeight', default: null as number | null},
    {name: 'productTitle', default: '', urlType: 'html', wordCount: true},
    {name: 'productDescription', default: '', urlType: 'html', wordCount: true},
    {name: 'productRatingEnabled', default: false},
    {name: 'productStarRating', default: 5},
    {name: 'productButtonEnabled', default: false},
    {name: 'productButton', default: ''},
    {name: 'productUrl', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

export type ProductData = DecoratorNodeData<typeof productProperties>;

export interface ProductNode extends DecoratorNodeValueMap<typeof productProperties> {}

export class ProductNode extends generateDecoratorNode({
    nodeType: 'product',
    properties: productProperties,
    defaultRenderFn: renderProductNode
}) {
    /* override */
    exportJSON() {
        // checks if src is a data string
        const {productImageSrc, productImageWidth, productImageHeight, productTitle, productDescription, productRatingEnabled, productStarRating, productButtonEnabled, productButton, productUrl} = this;
        const isBlob = productImageSrc && productImageSrc.startsWith('data:');

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

    isEmpty() {
        const isButtonFilled = this.__productButtonEnabled && this.__productUrl && this.__productButton;
        return !this.__productTitle && !this.__productDescription && !isButtonFilled && !this.__productImageSrc && !this.__productRatingEnabled;
    }
}

export const $createProductNode = (dataset: ProductData = {}) => {
    return new ProductNode(dataset);
};

export function $isProductNode(node: unknown): node is ProductNode {
    return node instanceof ProductNode;
}
