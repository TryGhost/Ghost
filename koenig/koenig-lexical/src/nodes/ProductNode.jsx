import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$createParagraphNode, $getRoot, createEditor} from 'lexical';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ProductNode as BaseProductNode, INSERT_PRODUCT_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ProductCardIcon} from '../assets/icons/kg-card-type-product.svg';
import {ProductNodeComponent} from './ProductNodeComponent';
import {isEditorEmpty} from '../utils/isEditorEmpty';

// re-export here, so we don't need to import from multiple places throughout the app
export {INSERT_PRODUCT_COMMAND} from '@tryghost/kg-default-nodes';

function setupNestedEditor(node, editorProperty, {editor, nodes = MINIMAL_NODES} = {}) {
    if (editor) {
        node[editorProperty] = editor;
    } else {
        node[editorProperty] = createEditor({nodes});
        node[editorProperty].update(() => {
            $getRoot().clear();
            $getRoot().append($createParagraphNode());
        });
    }
}

function populateNestedEditor(node, editorProperty, html) {
    if (!html) {
        return;
    }

    const nestedEditor = node[editorProperty];
    const editorState = generateEditorState({
        editor: nestedEditor,
        initialHtml: html
    });
    nestedEditor.setEditorState(editorState);

    // store the initial state separately as it's passed in to `<CollaborationPlugin />`
    // for use when there is no YJS document already stored
    node[`${editorProperty}InitialState`] = editorState;
}

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
        matches: ['product'],
        priority: 16
    }];

    getIcon() {
        return ProductCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up nested editor instances
        setupNestedEditor(this, '__titleEditor', {editor: dataset.titleEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__descriptionEditor', {editor: dataset.descriptionEditor, nodes: BASIC_NODES});

        // populate nested editors on initial construction
        if (!dataset.titleEditor && dataset.productTitle) {
            populateNestedEditor(this, '__titleEditor', `<p>${dataset.productTitle}</p>`); // we serialize with no wrapper
        }
        if (!dataset.descriptionEditor) {
            populateNestedEditor(this, '__descriptionEditor', dataset.productDescription);
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.titleEditor = self.__titleEditor;
        dataset.titleEditorInitialState = self.__titleEditorInitialState;
        dataset.descriptionEditor = self.__descriptionEditor;
        dataset.descriptionEditorInitialState = self.__descriptionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__titleEditor) {
            this.__titleEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__titleEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
                json.productTitle = cleanedHtml;
            });
        }
        if (this.__descriptionEditor) {
            this.__descriptionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__descriptionEditor, null);
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
                    descriptionEditor={this.__descriptionEditor}
                    descriptionEditorInitialState={this.__descriptionEditorInitialState}
                    imgHeight={this.getProductImageHeight()}
                    imgSrc={this.getProductImageSrc()}
                    imgWidth={this.getProductImageWidth()}
                    isButtonEnabled={this.getProductButtonEnabled()}
                    isRatingEnabled={this.getProductRatingEnabled()}
                    nodeKey={this.getKey()}
                    starRating={this.getProductStarRating()}
                    title={this.getProductTitle()}
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
