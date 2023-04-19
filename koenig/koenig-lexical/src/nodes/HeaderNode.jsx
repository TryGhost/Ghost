import HeaderNodeComponent from './HeaderNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
// import populateNestedEditor from '../utils/populateNestedEditor';
import {$generateHtmlFromNodes} from '@lexical/html';
import {HeaderNode as BaseHeaderNode, INSERT_HEADER_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as HeaderCardIcon} from '../assets/icons/kg-card-type-header.svg';
import {createEditor} from 'lexical';
export {INSERT_HEADER_COMMAND} from '@tryghost/kg-default-nodes';

export class HeaderNode extends BaseHeaderNode {
    __headerTextEditor;
    __subHeaderTextEditor;
    __headerTextEditorInitialState;
    __subHeaderTextEditorInitialState;

    static kgMenu = {
        label: 'Header',
        desc: 'Add a header',
        Icon: HeaderCardIcon,
        insertCommand: INSERT_HEADER_COMMAND,
        matches: ['header', 'heading']
    };

    getIcon() {
        return HeaderCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        this.__headerTextEditor = dataset.headerTextEditor || createEditor({nodes: MINIMAL_NODES});
        this.__headerTextEditorInitialState = dataset.headerTextEditorInitialState;
        if (!this.__headerTextEditorInitialState) {
            this.__headerTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml: dataset.header
            });
        }

        this.__subHeaderTextEditor = dataset.subHeaderTextEditor || createEditor({nodes: MINIMAL_NODES});
        this.__subHeaderTextEditorInitialState = dataset.subHeaderTextEditorInitialState;
        if (!this.__subHeaderTextEditorInitialState) {
            this.__subHeaderTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml: dataset.subheader
            });
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.header = cleanedHtml;
            });
        }

        if (this.__subHeaderTextEditor) {
            this.__subHeaderTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__subHeaderTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.subheader = cleanedHtml;
            });
        }

        return json;
    }

    createDOM() {
        return document.createElement('div');
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headerTextEditor = self.__headerTextEditor;
        dataset.subHeaderTextEditor = self.__subHeaderTextEditor;
        return dataset;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={'full'}>
                <HeaderNodeComponent
                    backgroundColor={this.getBackgroundImageStyle()}
                    backgroundImageSrc={this.getBackgroundImageSrc()}
                    backgroundImageStyle={this.getBackgroundImageStyle()}
                    button={this.getButtonEnabled()}
                    buttonPlaceholder={'Your button text'}
                    buttonText={this.getButtonText()}
                    buttonUrl={this.getButtonUrl()}
                    header={this.getHeader()}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
                    headingPlaceholder={'Enter heading text'}
                    nodeKey={this.getKey()}
                    size={this.getSize()}
                    subHeader={this.getSubheader()}
                    subHeaderTextEditor={this.__subHeaderTextEditor}
                    subHeaderTextEditorInitialState={this.__subHeaderTextEditorInitialState}
                    subHeadingPlaceholder={'Enter subheading text'}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
