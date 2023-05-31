import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {CodeBlockNode as BaseCodeBlockNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as CodeBlockIcon} from '../assets/icons/kg-card-type-gen-embed.svg';
import {CodeBlockNodeComponent} from './CodeBlockNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_CODE_BLOCK_COMMAND} from '@tryghost/kg-default-nodes';

export class CodeBlockNode extends BaseCodeBlockNode {
    // transient properties used to control node behaviour
    __openInEditMode = false;
    __captionEditor;
    __captionEditorInitialState;

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {_openInEditMode} = dataset;
        this.__openInEditMode = _openInEditMode || false;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `<p>${dataset.caption}</p>`); // we serialize with no wrapper
        }
    }

    getIcon() {
        return CodeBlockIcon;
    }

    clearOpenInEditMode() {
        const self = this.getWritable();
        self.__openInEditMode = false;
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth} wrapperStyle="code-card">
                <CodeBlockNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    code={this.__code}
                    language={this.__language}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createCodeBlockNode(dataset) {
    return new CodeBlockNode(dataset);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
