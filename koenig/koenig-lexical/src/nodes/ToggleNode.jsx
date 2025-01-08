import React from 'react';
import ToggleCardIcon from '../assets/icons/kg-card-type-toggle.svg?react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ToggleNode as BaseToggleNode} from '@tryghost/kg-default-nodes';
import {ToggleNodeComponent} from './ToggleNodeComponent';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_TOGGLE_COMMAND = createCommand();

export class ToggleNode extends BaseToggleNode {
    __headingEditor;
    __headingEditorInitialState;
    __contentEditor;
    __contentEditorInitialState;

    static kgMenu = [{
        label: 'Toggle',
        desc: 'Add collapsible content',
        Icon: ToggleCardIcon,
        insertCommand: INSERT_TOGGLE_COMMAND,
        matches: ['toggle', 'collapse'],
        priority: 12,
        shortcut: '/toggle'
    }];

    getIcon() {
        return ToggleCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headingEditor', {editor: dataset.headingEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__contentEditor', {editor: dataset.contentEditor, nodes: BASIC_NODES});

        // populate nested editors on initial construction
        if (!dataset.headingEditor && dataset.heading) {
            populateNestedEditor(this, '__headingEditor', `${dataset.heading}`);
        }
        if (!dataset.contentEditor && dataset.content) {
            populateNestedEditor(this, '__contentEditor', dataset.content);
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headingEditor = self.__headingEditor;
        dataset.headingEditorInitialState = self.__headingEditorInitialState;
        dataset.contentEditor = self.__contentEditor;
        dataset.contentEditorInitialState = self.__contentEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__headingEditor) {
            this.__headingEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headingEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.heading = cleanedHtml;
            });
        }
        if (this.__contentEditor) {
            this.__contentEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__contentEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {allowBr: true});

                json.content = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ToggleNodeComponent
                    contentEditor={this.__contentEditor}
                    contentEditorInitialState={this.__contentEditorInitialState}
                    headingEditor={this.__headingEditor}
                    headingEditorInitialState={this.__headingEditorInitialState}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHeadingEmpty = this.__headingEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isContentEmpty = this.__contentEditor.getEditorState().read($canShowPlaceholderCurry(false));

        return isHeadingEmpty && isContentEmpty;
    }
}

export const $createToggleNode = (dataset) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node) {
    return node instanceof ToggleNode;
}
