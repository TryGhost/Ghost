import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import populateNestedEditor from '../utils/populateNestedEditor';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getRoot, createEditor} from 'lexical';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ToggleNode as BaseToggleNode, INSERT_TOGGLE_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ToggleCardIcon} from '../assets/icons/kg-card-type-toggle.svg';
import {ToggleNodeComponent} from './ToggleNodeComponent';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_TOGGLE_COMMAND} from '@tryghost/kg-default-nodes';

export class ToggleNode extends BaseToggleNode {
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
        if (!dataset.headerEditor) {
            // wrap the header in a paragraph so it gets parsed correctly
            // - we serialize with no wrapper so the renderer can decide how to wrap it
            const initialHtml = dataset.header ? `<p>${dataset.header}</p>` : null;
            populateNestedEditor({editor: this.__headerEditor, initialHtml});
        }
        this.__contentEditor = dataset.contentEditor || createEditor({nodes: BASIC_NODES});
        if (!dataset.contentEditor) {
            populateNestedEditor({editor: this.__contentEditor, initialHtml: dataset.content});
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headerEditor = self.__headerEditor;
        dataset.contentEditor = self.__contentEditor;

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
                const selection = $getRoot().getFirstChild()?.select();

                if (selection) {
                    const html = $generateHtmlFromNodes(this.__headerEditor, selection);
                    const cleanedHtml = cleanBasicHtml(html);
                    json.header = cleanedHtml;
                } else {
                    json.header = '';
                }
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
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <ToggleNodeComponent
                    contentEditor={this.__contentEditor}
                    headerEditor={this.__headerEditor}
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
