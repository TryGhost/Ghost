import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getRoot, $getSelection, $setSelection, createEditor} from 'lexical';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ToggleNode as BaseToggleNode, INSERT_TOGGLE_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ToggleCardIcon} from '../assets/icons/kg-card-type-toggle.svg';
import {ToggleNodeComponent} from './ToggleNodeComponent';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_TOGGLE_COMMAND} from '@tryghost/kg-default-nodes';

export class ToggleNode extends BaseToggleNode {
    __headerEditor;
    __headerEditorInitialState;
    __contentEditor;
    __contentEditorInitialState;

    static kgMenu = [{
        label: 'Toggle',
        desc: 'Add collapsible content',
        Icon: ToggleCardIcon,
        insertCommand: INSERT_TOGGLE_COMMAND,
        matches: ['toggle', 'collapse']
    }];

    getIcon() {
        return ToggleCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up and populate nested editors from the serialized HTML
        this.__headerEditor = dataset.headerEditor || createEditor({nodes: MINIMAL_NODES});
        this.__headerEditorInitialState = dataset.headerEditorInitialState;
        if (!this.__headerEditorInitialState) {
            // wrap the header in a paragraph so it gets parsed correctly
            // - we serialize with no wrapper so the renderer can decide how to wrap it
            const initialHtml = dataset.header ? `<p>${dataset.header}</p>` : null;

            // store the initial state separately as it's passed in to `<CollaborationPlugin />`
            // for use when there is no YJS document already stored
            this.__headerEditorInitialState = generateEditorState({
                // create a new editor instance so we don't pre-fill an editor that will be filled by YJS content
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }

        this.__contentEditor = dataset.contentEditor || createEditor({nodes: BASIC_NODES});
        this.__contentEditorInitialState = dataset.contentEditorInitialState;
        if (!dataset.contentEditor) {
            this.__contentEditorInitialState = generateEditorState({
                // create a new editor instance so we don't pre-fill an editor that will be filled by YJS content
                editor: createEditor({nodes: BASIC_NODES}),
                initialHtml: dataset.content
            });
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headerEditor = self.__headerEditor;
        dataset.headerEditorInitialState = self.__headerEditorInitialState;
        dataset.contentEditor = self.__contentEditor;
        dataset.contentEditorInitialState = self.__contentEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__headerEditor) {
            this.__headerEditor.update(() => {
                // for the header we don't want any wrapper element in the serialized data,
                // just the first element's contents
                const currentSelection = $getSelection();
                const firstChildSelection = $getRoot().getFirstChild()?.select();

                if (firstChildSelection) {
                    const html = $generateHtmlFromNodes(this.__headerEditor, firstChildSelection);
                    const cleanedHtml = cleanBasicHtml(html);
                    json.header = cleanedHtml;
                } else {
                    json.header = '';
                }

                // reset the selection to avoid focus stealing and odd behaviour
                $setSelection(currentSelection);
            });
        }
        if (this.__contentEditor) {
            this.__contentEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__contentEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.content = cleanedHtml;
            });
        }

        return json;
    }

    createDOM() {
        return document.createElement('div');
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ToggleNodeComponent
                    contentEditor={this.__contentEditor}
                    contentEditorInitialState={this.__contentEditorInitialState}
                    headerEditor={this.__headerEditor}
                    headerEditorInitialState={this.__headerEditorInitialState}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHeaderEmpty = this.__headerEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isContentEmpty = this.__contentEditor.getEditorState().read($canShowPlaceholderCurry(false));

        return isHeaderEmpty && isContentEmpty;
    }
}

export const $createToggleNode = (dataset) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node) {
    return node instanceof ToggleNode;
}
