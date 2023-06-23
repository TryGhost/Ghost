import HeaderNodeComponent from './HeaderNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {HeaderNode as BaseHeaderNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as HeaderCardIcon} from '../assets/icons/kg-card-type-header.svg';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_HEADER_COMMAND = createCommand();

export class HeaderNode extends BaseHeaderNode {
    __headerTextEditor;
    __subheaderTextEditor;
    __headerTextEditorInitialState;
    __subheaderTextEditorInitialState;

    static kgMenu = {
        label: 'Header',
        desc: 'Add a header',
        Icon: HeaderCardIcon,
        insertCommand: INSERT_HEADER_COMMAND,
        matches: ['header', 'heading'],
        priority: 17
    };

    getIcon() {
        return HeaderCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__subheaderTextEditor', {editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `<p>${dataset.header}</p>`); // we serialize with no wrapper
        }
        if (!dataset.subheaderTextEditor && dataset.subheader) {
            populateNestedEditor(this, '__subheaderTextEditor', `<p>${dataset.subheader}</p>`); // we serialize with no wrapper
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.header = cleanedHtml;
            });
        }

        if (this.__subheaderTextEditor) {
            this.__subheaderTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__subheaderTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.subheader = cleanedHtml;
            });
        }

        return json;
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headerTextEditor = self.__headerTextEditor;
        dataset.subheaderTextEditor = self.__subheaderTextEditor;
        return dataset;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={'full'}>
                <HeaderNodeComponent
                    backgroundImageSrc={this.backgroundImageSrc}
                    button={this.buttonEnabled}
                    buttonText={this.buttonText}
                    buttonUrl={this.buttonUrl}
                    header={this.header}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
                    nodeKey={this.getKey()}
                    size={this.size}
                    subheader={this.subheader}
                    subheaderTextEditor={this.__subheaderTextEditor}
                    subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
                    type={this.style}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__headerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isSubHtmlEmpty = this.__subheaderTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && isSubHtmlEmpty && (!this.buttonEnabled || (!this.buttonText && !this.buttonUrl)) && !this.backgroundImageSrc;
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
