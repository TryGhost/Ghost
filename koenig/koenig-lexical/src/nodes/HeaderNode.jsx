import HeaderCardIcon from '../assets/icons/kg-card-type-header.svg?react';
import HeaderNodeComponent from './header/v2/HeaderNodeComponent';
import HeaderNodeComponentV1 from './header/v1/HeaderNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {HeaderNode as BaseHeaderNode} from '@tryghost/kg-default-nodes';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_HEADER_COMMAND = createCommand();

export class HeaderNode extends BaseHeaderNode {
    __headerTextEditor;
    __subheaderTextEditor;
    __headerTextEditorInitialState;
    __subheaderTextEditorInitialState;

    // We keep Header v1 here for testing and backwards compatibility
    // we keep it hidden in the Menu in Ghost but visible in the Demo to ensure it remains tested till we full deprecate it in the future
    static kgMenu = [
        {
            label: 'Header1',
            desc: 'Add a header',
            Icon: HeaderCardIcon,
            insertCommand: INSERT_HEADER_COMMAND,
            matches: ['v1_header', 'v1_heading'],
            priority: 17,
            insertParams: () => ({
                version: 1
            }),
            isHidden: ({config}) => {
                return config?.deprecated?.headerV1 ?? true;
            },
            shortcut: '/header'
        },
        {
            label: 'Header',
            desc: 'Add a header',
            Icon: HeaderCardIcon,
            insertCommand: INSERT_HEADER_COMMAND,
            matches: ['header', 'heading'],
            priority: 17,
            insertParams: () => ({
                version: 2
            }),
            shortcut: '/header'
        }
    ];

    getIcon() {
        return HeaderCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__subheaderTextEditor', {editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `${dataset.header}`); // we serialize with no wrapper
        }
        if (!dataset.subheaderTextEditor && dataset.subheader) {
            populateNestedEditor(this, '__subheaderTextEditor', `${dataset.subheader}`); // we serialize with no wrapper
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

    getCardWidth() {
        const version = this.version;

        if (version === 1) {
            return 'full';
        }

        if (version === 2) {
            const layout = this.layout;
            return layout === 'split' ? 'full' : layout;
        }
    }

    decorate() {
        // for backwards compatibility with v1 cards
        if (this.version === 1) {
            return (
                <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                    <HeaderNodeComponentV1
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

        if (this.version === 2) {
            return (
                <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                    <HeaderNodeComponent
                        accentColor={this.accentColor}
                        alignment={this.alignment}
                        backgroundColor={this.backgroundColor}
                        backgroundImageHeight={this.backgroundImageHeight}
                        backgroundImageSrc={this.backgroundImageSrc}
                        backgroundImageWidth={this.backgroundImageWidth}
                        backgroundSize={this.backgroundSize}
                        buttonColor={this.buttonColor}
                        buttonEnabled={this.buttonEnabled}
                        buttonText={this.buttonText}
                        buttonTextColor={this.buttonTextColor}
                        buttonUrl={this.buttonUrl}
                        header={this.header}
                        headerTextEditor={this.__headerTextEditor}
                        headerTextEditorState={this.__headerTextEditorInitialState}
                        isSwapped={this.swapped}
                        layout={this.layout}
                        nodeKey={this.getKey()}
                        subheader={this.subheader}
                        subheaderTextEditor={this.__subheaderTextEditor}
                        subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
                        subheaderTextEditorState={this.__subheaderTextEditorInitialState}
                        textColor={this.textColor}
                    />
                </KoenigCardWrapper>
            );
        }
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
