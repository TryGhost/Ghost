import * as React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper} from '../index.js';
import {EmailCtaNode as BaseEmailCtaNode, INSERT_EMAIL_CTA_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as EmailCtaCardIcon} from '../assets/icons/kg-card-type-email-cta.svg';
import {EmailCtaNodeComponent} from './EmailCtaNodeComponent';
import {ReactComponent as EmailIndicatorIcon} from '../assets/icons/kg-indicator-email.svg';
import {createEditor} from 'lexical';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_EMAIL_CTA_COMMAND} from '@tryghost/kg-default-nodes';

export class EmailCtaNode extends BaseEmailCtaNode {
    __htmlEditor;
    __htmlEditorInitialState;

    static kgMenu = {
        label: 'Email call to action',
        desc: 'Target free or paid members with a CTA',
        Icon: EmailCtaCardIcon,
        insertCommand: INSERT_EMAIL_CTA_COMMAND,
        matches: ['email', 'cta', 'email-cta'],
        priority: 8
    };

    getIcon() {
        return EmailCtaCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // create nested editor
        this.__htmlEditor = dataset.htmlEditor || createEditor({nodes: BASIC_NODES});
        this.__htmlEditorInitialState = dataset.htmlEditorInitialState;
        if (!this.__htmlEditorInitialState) {
            this.__htmlEditorInitialState = generateEditorState({
                editor: createEditor({nodes: BASIC_NODES}),
                initialHtml: dataset.html
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
        const div = document.createElement('div');
        return div;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={EmailIndicatorIcon}
                nodeKey={this.getKey()}
                width={this.__cardWidth}
                wrapperStyle="wide"
            >
                <EmailCtaNodeComponent
                    alignment={this.getAlignment()}
                    buttonText={this.getButtonText()}
                    buttonUrl={this.getButtonUrl()}
                    htmlEditor={this.__htmlEditor}
                    htmlEditorInitialState={this.__htmlEditorInitialState}
                    nodeKey={this.getKey()}
                    segment={this.__segment}
                    showButton={this.getShowButton()}
                    showDividers={this.getShowDividers()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__htmlEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && (!this.getShowButton() || (!this.getButtonText() && !this.getButtonUrl()));
    }
}

export function $createEmailCtaNode() {
    return new EmailCtaNode();
}

export function $isEmailCtaNode(node) {
    return node instanceof EmailCtaNode;
}
