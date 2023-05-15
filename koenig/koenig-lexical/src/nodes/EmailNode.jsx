import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper} from '../index.js';
import {EmailNode as BaseEmailNode, INSERT_EMAIL_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as EmailCardIcon} from '../assets/icons/kg-card-type-email.svg';
import {ReactComponent as EmailIndicatorIcon} from '../assets/icons/kg-indicator-email.svg';
import {EmailNodeComponent} from './EmailNodeComponent';
import {createEditor} from 'lexical';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_EMAIL_COMMAND} from '@tryghost/kg-default-nodes';

export class EmailNode extends BaseEmailNode {
    __htmlEditor;
    __htmlEditorInitialState;

    static kgMenu = [{
        label: 'Email content',
        desc: 'Only visible when delivered by email',
        Icon: EmailCardIcon,
        insertCommand: INSERT_EMAIL_COMMAND,
        matches: ['email content', 'only email'],
        priority: 7
    }];

    getIcon() {
        return EmailCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // create nested editor
        this.__htmlEditor = dataset.htmlEditor || createEditor({nodes: BASIC_NODES});
        this.__htmlEditorInitialState = dataset.htmlEditorInitialState;
        if (!this.__htmlEditorInitialState) {
            const initialHtml = dataset.html ? dataset.html : '<p>Hey <code>{first_name, "there"}</code>,</p>';
            this.__htmlEditorInitialState = generateEditorState({
                editor: createEditor({nodes: BASIC_NODES}),
                initialHtml
            });
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.htmlEditor = self.__htmlEditor;
        dataset.htmlEditorInitialState = self.__htmlEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__htmlEditor) {
            this.__htmlEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__htmlEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {removeCodeWrappers: true});
                json.html = cleanedHtml;
            });
        }

        return json;
    }

    createDOM() {
        return document.createElement('div');
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={EmailIndicatorIcon}
                nodeKey={this.getKey()}
                width={this.__cardWidth}
                wrapperStyle="wide"
            >
                <EmailNodeComponent
                    htmlEditor={this.__htmlEditor}
                    htmlEditorInitialState={this.__htmlEditorInitialState}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__htmlEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty;
    }
}

export const $createEmailNode = (dataset) => {
    return new EmailNode(dataset);
};

export function $isEmailNode(node) {
    return node instanceof EmailNode;
}
