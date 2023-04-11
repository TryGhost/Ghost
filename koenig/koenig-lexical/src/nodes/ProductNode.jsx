import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ProductNode as BaseProductNode, INSERT_PRODUCT_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ProductCardIcon} from '../assets/icons/kg-card-type-product.svg';
import {ProductNodeComponent} from './ProductNodeComponent';
import {createEditor} from 'lexical';
import {isEditorEmpty} from '../utils/isEditorEmpty';

// re-export here, so we don't need to import from multiple places throughout the app
export {INSERT_PRODUCT_COMMAND} from '@tryghost/kg-default-nodes';

export class ProductNode extends BaseProductNode {
    __titleEditor;
    __titleEditorInitialState;
    __descriptionEditor;
    __descriptionEditorInitialState;

    static kgMenu = [{
        label: 'Product',
        desc: 'Add a product recommendation',
        Icon: ProductCardIcon,
        insertCommand: INSERT_PRODUCT_COMMAND,
        matches: ['product']
    }];

    getIcon() {
        return ProductCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up and populate nested editors from the serialized HTML
        this.__titleEditor = dataset.titleEditor || createEditor({nodes: MINIMAL_NODES});
        if (!dataset.titleEditor) {
            this.__titleEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml: dataset.title
            });
        }
        this.__descriptionEditor = dataset.descriptionEditor || createEditor({nodes: BASIC_NODES});
        if (!dataset.descriptionEditor) {
            this.__descriptionEditorInitialState = generateEditorState({
                editor: createEditor({nodes: BASIC_NODES}),
                initialHtml: dataset.description
            });
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.titleEditor = self.__titleEditor;
        dataset.descriptionEditor = self.__descriptionEditor;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__titleEditor) {
            this.__titleEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__titleEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.title = cleanedHtml;
            });
        }
        if (this.__descriptionEditor) {
            this.__descriptionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__descriptionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.description = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ProductNodeComponent
                    buttonText={this.getButtonText()}
                    buttonUrl={this.getButtonUrl()}
                    descriptionEditor={this.__descriptionEditor}
                    descriptionEditorInitialState={this.__descriptionEditorInitialState}
                    imgHeight={this.getImgHeight()}
                    imgSrc={this.getImgSrc()}
                    imgWidth={this.getImgWidth()}
                    isButtonEnabled={this.getIsButtonEnabled()}
                    isRatingEnabled={this.getIsRatingEnabled()}
                    nodeKey={this.getKey()}
                    starRating={this.getStarRating()}
                    titleEditor={this.__titleEditor}
                    titleEditorInitialState={this.__titleEditorInitialState}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isTitleEmpty = isEditorEmpty(this.__titleEditor);
        const isDescriptionEmpty = isEditorEmpty(this.__descriptionEditor);
        const isButtonFilled = this.getIsButtonEnabled() && this.getButtonUrl() && this.getButtonText();

        return isTitleEmpty && isDescriptionEmpty && !isButtonFilled && !this.getImgSrc() && !this.getIsRatingEnabled();
    }
}

export const $createProductNode = (dataset) => {
    return new ProductNode(dataset);
};

export function $isProductNode(node) {
    return node instanceof ProductNode;
}
