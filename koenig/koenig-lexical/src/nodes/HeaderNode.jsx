import HeaderNodeComponent from './HeaderNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
// import populateNestedEditor from '../utils/populateNestedEditor';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {HeaderNode as BaseHeaderNode, INSERT_HEADER_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as HeaderCardIcon} from '../assets/icons/kg-card-type-header.svg';
import {createEditor} from 'lexical';
export {INSERT_HEADER_COMMAND} from '@tryghost/kg-default-nodes';

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
            // wrap the header in a paragraph so it gets parsed correctly
            // - we serialize with no wrapper so the renderer can decide how to wrap it
            const initialHtml = dataset.header ? `<p>${dataset.header}</p>` : null;
            this.__headerTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }

        this.__subheaderTextEditor = dataset.subheaderTextEditor || createEditor({nodes: MINIMAL_NODES});
        this.__subheaderTextEditorInitialState = dataset.subheaderTextEditorInitialState;
        if (!this.__subheaderTextEditorInitialState) {
            // wrap the header in a paragraph so it gets parsed correctly
            // - we serialize with no wrapper so the renderer can decide how to wrap it
            const initialHtml = dataset.subheader ? `<p>${dataset.subheader}</p>` : null;
            this.__subheaderTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
                json.header = cleanedHtml;
            });
        }

        if (this.__subheaderTextEditor) {
            this.__subheaderTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__subheaderTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
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
        dataset.subheaderTextEditor = self.__subheaderTextEditor;
        return dataset;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={'full'}>
                <HeaderNodeComponent
                    backgroundImageSrc={this.getBackgroundImageSrc()}
                    button={this.getButtonEnabled()}
                    buttonPlaceholder={'Add button text'}
                    buttonText={this.getButtonText()}
                    buttonUrl={this.getButtonUrl()}
                    header={this.getHeader()}
                    headerPlaceholder={'Enter heading text'}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
                    nodeKey={this.getKey()}
                    size={this.getSize()}
                    subheader={this.getSubheader()}
                    subheaderPlaceholder={'Enter subheading text'}
                    subheaderTextEditor={this.__subheaderTextEditor}
                    subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
                    type={this.getStyle()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__headerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isSubHtmlEmpty = this.__subheaderTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && isSubHtmlEmpty && (!this.__buttonEnabled || (!this.__buttonText && !this.__buttonUrl)) && !this.__backgroundImageSrc;
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
