import * as React from 'react';
import EmailCtaCardIcon from '../assets/icons/kg-card-type-email-cta.svg?react';
import EmailIndicatorIcon from '../assets/icons/kg-indicator-email.svg?react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper} from '../index.js';
import {EmailCtaNode as BaseEmailCtaNode} from '@tryghost/kg-default-nodes';
import {EmailCtaNodeComponent} from './EmailCtaNodeComponent';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_EMAIL_CTA_COMMAND = createCommand();

export class EmailCtaNode extends BaseEmailCtaNode {
    __htmlEditor;
    __htmlEditorInitialState;

    static kgMenu = {
        label: 'Email call to action',
        desc: 'Target free or paid members with a CTA',
        Icon: EmailCtaCardIcon,
        insertCommand: INSERT_EMAIL_CTA_COMMAND,
        matches: ['email', 'cta', 'email-cta'],
        priority: 8,
        postType: 'post',
        shortcut: '/email-cta'
    };

    getIcon() {
        return EmailCtaCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up nested editor instances
        setupNestedEditor(this, '__htmlEditor', {editor: dataset.htmlEditor, nodes: BASIC_NODES});

        // populate nested editors on initial construction
        if (!dataset.htmlEditor) {
            populateNestedEditor(this, '__htmlEditor', dataset.html);
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
                const cleanedHtml = cleanBasicHtml(html, {removeCodeWrappers: true, allowBr: true});
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
                <EmailCtaNodeComponent
                    alignment={this.alignment}
                    buttonText={this.buttonText}
                    buttonUrl={this.buttonUrl}
                    htmlEditor={this.__htmlEditor}
                    htmlEditorInitialState={this.__htmlEditorInitialState}
                    nodeKey={this.getKey()}
                    segment={this.__segment}
                    showButton={this.showButton}
                    showDividers={this.showDividers}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__htmlEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && (!this.showButton || (!this.buttonText && !this.buttonUrl));
    }
}

export function $createEmailCtaNode() {
    return new EmailCtaNode();
}

export function $isEmailCtaNode(node) {
    return node instanceof EmailCtaNode;
}
