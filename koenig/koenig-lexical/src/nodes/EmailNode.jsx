import EmailCardIcon from '../assets/icons/kg-card-type-email.svg?react';
import EmailIndicatorIcon from '../assets/icons/kg-indicator-email.svg?react';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper} from '../index.js';
import {EmailNode as BaseEmailNode} from '@tryghost/kg-default-nodes';
import {EmailNodeComponent} from './EmailNodeComponent';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_EMAIL_COMMAND = createCommand();

export class EmailNode extends BaseEmailNode {
    __htmlEditor;
    __htmlEditorInitialState;

    static kgMenu = [{
        label: 'Email content',
        desc: 'Only visible when delivered by email',
        Icon: EmailCardIcon,
        insertCommand: INSERT_EMAIL_COMMAND,
        matches: ['email content', 'only email'],
        priority: 7,
        postType: 'post',
        shortcut: '/email'
    }];

    getIcon() {
        return EmailCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up nested editor instances
        setupNestedEditor(this, '__htmlEditor', {editor: dataset.htmlEditor, nodes: BASIC_NODES});

        // populate nested editors on initial construction
        if (!dataset.htmlEditor) {
            populateNestedEditor(this, '__htmlEditor', dataset.html || '<p>Hey <code>{first_name, "there"}</code>,</p>');
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
                const cleanedHtml = cleanBasicHtml(html, {removeCodeWrappers: false, allowBr: true});
                json.html = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={EmailIndicatorIcon}
                nodeKey={this.getKey()}
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
