import EmailCtaCardIcon from '../assets/icons/kg-card-type-email-cta.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES} from '../index.js';
import {CallToActionNode as BaseCallToActionNode} from '@tryghost/kg-default-nodes';
import {CallToActionNodeComponent} from './CallToActionNodeComponent';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_CTA_COMMAND = createCommand();

export class CallToActionNode extends BaseCallToActionNode {
    __ctaHtmlEditor;
    __ctaHtmlEditorInitialState;
    __sponsorLabelHtmlEditor;
    __sponsorLabelHtmlEditorInitialState;

    static kgMenu = {
        label: 'Call to Action',
        desc: 'Add a call to action to your post',
        Icon: EmailCtaCardIcon,
        insertCommand: INSERT_CTA_COMMAND,
        matches: ['cta', 'call-to-action'],
        priority: 10,
        shortcut: '/cta',
        isHidden: ({config}) => {
            return !(config?.feature?.contentVisibilityAlpha === true);
        }
    };

    static getType() {
        return 'call-to-action';
    }

    getIcon() {
        return EmailCtaCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up nested editor instances
        setupNestedEditor(this, '__ctaHtmlEditor', {editor: dataset.ctaHtmlEditor, nodes: BASIC_NODES});
        setupNestedEditor(this, '__sponsorLabelHtmlEditor', {editor: dataset.sponsorLabelHtmlEditor, nodes: BASIC_NODES});

        // populate nested editors on initial construction
        if (!dataset.ctaHtmlEditor && dataset.textValue) {
            populateNestedEditor(this, '__ctaHtmlEditor', `${dataset.textValue}`); // we serialize with no wrapper
        }
        if (!dataset.sponsorLabelHtmlEditor) {
            populateNestedEditor(this, '__sponsorLabelHtmlEditor', `${dataset.sponsorLabel || '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'}`);
        }
    }

    getDataset() {
        const dataset = super.getDataset();
        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.ctaHtmlEditor = self.__ctaHtmlEditor;
        dataset.ctaHtmlEditorInitialState = self.__ctaHtmlEditorInitialState;
        dataset.sponsorLabelHtmlEditor = self.__sponsorLabelHtmlEditor;
        dataset.sponsorLabelHtmlEditorInitialState = self.__sponsorLabelHtmlEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instance back into HTML because `text` may not
        // be automatically updated when the nested editor changes
        if (this.__ctaHtmlEditor) {
            this.__ctaHtmlEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__ctaHtmlEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {allowBr: true});
                json.textValue = cleanedHtml;
            });
        }

        if (this.__sponsorLabelHtmlEditor) {
            this.__sponsorLabelHtmlEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__sponsorLabelHtmlEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {allowBr: false});
                json.sponsorLabel = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                wrapperStyle={this.backgroundColor === 'none' ? 'wide' : 'regular'}
            >
                <CallToActionNodeComponent
                    backgroundColor={this.backgroundColor}
                    buttonColor={this.buttonColor}
                    buttonText={this.buttonText}
                    buttonTextColor={this.buttonTextColor}
                    buttonUrl={this.buttonUrl}
                    hasImage={this.hasImage}
                    hasSponsorLabel={this.hasSponsorLabel}
                    htmlEditor={this.__ctaHtmlEditor}
                    htmlEditorInitialState={this.__ctaHtmlEditorInitialState}
                    imageUrl={this.imageUrl}
                    layout={this.layout}
                    nodeKey={this.getKey()}
                    showButton={this.showButton}
                    sponsorLabelHtmlEditor={this.__sponsorLabelHtmlEditor}
                    sponsorLabelHtmlEditorInitialState={this.__sponsorLabelHtmlEditorInitialState}
                    textValue={this.textValue}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createCallToActionNode(dataset) {
    return new CallToActionNode(dataset);
}

export function $isCallToActionNode(node) {
    return node instanceof CallToActionNode;
}
