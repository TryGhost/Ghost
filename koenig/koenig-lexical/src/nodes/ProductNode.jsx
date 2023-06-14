import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ProductNode as BaseProductNode, INSERT_PRODUCT_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ProductCardIcon} from '../assets/icons/kg-card-type-product.svg';
import {ProductNodeComponent} from './ProductNodeComponent';
import {isEditorEmpty} from '../utils/isEditorEmpty';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors.js';

// re-export here, so we don't need to import from multiple places throughout the app
export {INSERT_PRODUCT_COMMAND} from '@tryghost/kg-default-nodes';
export class ProductNode extends BaseProductNode {
    __productTitleEditor;
    __productTitleEditorInitialState;
    __productDescriptionEditor;
    __productDescriptionEditorInitialState;

    static kgMenu = [{
        label: 'Product',
        desc: 'Add a product recommendation',
        Icon: ProductCardIcon,
        insertCommand: INSERT_PRODUCT_COMMAND,
        matches: ['product'],
        priority: 16
    }];

    getIcon() {
        return ProductCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up nested editor instances
        setupNestedEditor(this, '__productTitleEditor', {editor: dataset.productTitleEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__productDescriptionEditor', {editor: dataset.productDescriptionEditor, nodes: BASIC_NODES});

        // populate nested editors on initial construction
        if (!dataset.productTitleEditor && dataset.productTitle) {
            populateNestedEditor(this, '__productTitleEditor', `<p>${dataset.productTitle}</p>`); // we serialize with no wrapper
        }
        if (!dataset.productDescriptionEditor) {
            populateNestedEditor(this, '__productDescriptionEditor', dataset.productDescription);
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.productTitleEditor = self.__productTitleEditor;
        dataset.productTitleEditorInitialState = self.__productTitleEditorInitialState;
        dataset.productDescriptionEditor = self.__productDescriptionEditor;
        dataset.productDescriptionEditorInitialState = self.__productDescriptionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__productTitleEditor) {
            this.__productTitleEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__productTitleEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
                json.productTitle = cleanedHtml;
            });
        }
        if (this.__productDescriptionEditor) {
            this.__productDescriptionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__productDescriptionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.productDescription = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ProductNodeComponent
                    buttonText={this.getProductButton()}
                    buttonUrl={this.getProductUrl()}
                    description={this.getProductDescription()}
                    descriptionEditor={this.__productDescriptionEditor}
                    descriptionEditorInitialState={this.__productDescriptionEditorInitialState}
                    imgHeight={this.getProductImageHeight()}
                    imgSrc={this.getProductImageSrc()}
                    imgWidth={this.getProductImageWidth()}
                    isButtonEnabled={this.getProductButtonEnabled()}
                    isRatingEnabled={this.getProductRatingEnabled()}
                    nodeKey={this.getKey()}
                    starRating={this.getProductStarRating()}
                    title={this.getProductTitle()}
                    titleEditor={this.__productTitleEditor}
                    titleEditorInitialState={this.__productTitleEditorInitialState}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isTitleEmpty = isEditorEmpty(this.__productTitleEditor);
        const isDescriptionEmpty = isEditorEmpty(this.__productDescriptionEditor);
        const isButtonFilled = this.getProductButtonEnabled() && this.getProductUrl() && this.getProductButton();

        return isTitleEmpty && isDescriptionEmpty && !isButtonFilled && !this.getProductImageSrc() && !this.getProductRatingEnabled();
    }
}

export const $createProductNode = (dataset) => {
    return new ProductNode(dataset);
};

export function $isProductNode(node) {
    return node instanceof ProductNode;
}
