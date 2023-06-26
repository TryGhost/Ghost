import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import SignupNodeComponent from './SignupNodeComponent';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {SignupNode as BaseSignupNode, INSERT_SIGNUP_COMMAND} from '@tryghost/kg-default-nodes';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

import {ReactComponent as SignupCardIcon} from '../assets/icons/kg-card-type-signup.svg';

export {INSERT_SIGNUP_COMMAND} from '@tryghost/kg-default-nodes';

export class SignupNode extends BaseSignupNode {
    __disclaimerTextEditor;
    __disclaimerTextEditorInitialState;
    __headerTextEditor;
    __headerTextEditorInitialState;
    __subheaderTextEditor;
    __subheaderTextEditorInitialState;

    static kgMenu = {
        label: 'Signup',
        desc: 'Convert visitors into members',
        Icon: SignupCardIcon,
        insertCommand: INSERT_SIGNUP_COMMAND,
        matches: ['signup', 'subscribe'],
        isHidden: ({config}) => {
            const isMembersEnabled = config?.membersEnabled;
            return !(isMembersEnabled);
        },
        insertParams: ({config}) => ({
            header: config?.siteTitle ? `Sign up for ${config.siteTitle}` : '',
            subheader: config?.siteDescription || '',
            disclaimer: 'No spam. Unsubscribe anytime.'
        })
    };

    getIcon() {
        return SignupCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__subheaderTextEditor', {editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__disclaimerTextEditor', {editor: dataset.disclaimerTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `<p>${dataset.header}</p>`);
        }

        // populate nested editors on initial construction
        if (!dataset.subheaderTextEditor && dataset.subheader) {
            populateNestedEditor(this, '__subheaderTextEditor', `<p>${dataset.subheader}</p>`);
        }

        // populate nested editors on initial construction
        if (!dataset.disclaimerTextEditor && dataset.disclaimer) {
            populateNestedEditor(this, '__disclaimerTextEditor', `<p>${dataset.disclaimer}</p>`);
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__disclaimerTextEditor) {
            this.__disclaimerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__disclaimerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.disclaimer = cleanedHtml;
            });
        }

        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.header = cleanedHtml;
            });
        }

        if (this.__subheaderTextEditor) {
            this.__subheaderTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__subheaderTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
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
        const self = this.getLatest();

        dataset.disclaimerTextEditor = self.__disclaimerTextEditor;
        dataset.headerTextEditor = self.__headerTextEditor;
        dataset.subheaderTextEditor = self.__subheaderTextEditor;

        return dataset;
    }

    getCardWidth() {
        const layout = this.getLayout();

        return layout === 'split' ? 'full' : layout;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                <SignupNodeComponent
                    alignment={this.getAlignment()}
                    backgroundColor={this.getBackgroundColor()}
                    backgroundImageSrc={this.getBackgroundImageSrc()}
                    backgroundSize={this.getBackgroundSize()}
                    buttonColor={this.getButtonColor()}
                    buttonText={this.getButtonText()}
                    buttonTextColor={this.getButtonTextColor()}
                    disclaimer={this.getDisclaimer()}
                    disclaimerTextEditor={this.__disclaimerTextEditor}
                    disclaimerTextEditorInitialState={this.__disclaimerTextEditorInitialState}
                    header={this.getHeader()}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
                    isSwapped={this.getSwapped()}
                    labels={this.getLabels()}
                    layout={this.getLayout()}
                    nodeKey={this.getKey()}
                    subheader={this.getSubheader()}
                    subheaderTextEditor={this.__subheaderTextEditor}
                    subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
                    textColor={this.getTextColor()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHeaderEmpty = this.__headerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isSubheaderEmpty = this.__subheaderTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isDisclaimerEmpty = this.__disclaimerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));

        return !this.__backgroundColor &&
            !this.__backgroundImageSrc &&
            !this.__buttonColor &&
            !this.__buttonText &&
            isDisclaimerEmpty &&
            isHeaderEmpty &&
            !this.__labels.length &&
            isSubheaderEmpty;
    }
}

export const $createSignupNode = (dataset) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node) {
    return node instanceof SignupNode;
}
