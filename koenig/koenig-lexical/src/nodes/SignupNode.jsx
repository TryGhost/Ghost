import BASIC_NODES from './BasicNodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import SignupNodeComponent from './SignupNodeComponent';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {SignupNode as BaseSignupNode, INSERT_SIGNUP_COMMAND} from '@tryghost/kg-default-nodes';
import {createEditor} from 'lexical';

// TODO: Update icon
import {ReactComponent as SignupCardIcon} from '../assets/icons/kg-card-type-other.svg';

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
        isHidden: ({config}) => !config?.feature?.signupCard
    };

    getIcon() {
        return SignupCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        this.__disclaimerTextEditor = dataset.disclaimerTextEditor || createEditor({nodes: BASIC_NODES});
        this.__disclaimerTextEditorInitialState = dataset.disclaimerTextEditorInitialState;
        if (!this.__disclaimerTextEditorInitialState) {
            const initialHtml = dataset.disclaimer ? `<p>${dataset.disclaimer}</p>` : null;
            this.__disclaimerTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }

        this.__headerTextEditor = dataset.headerTextEditor || createEditor({nodes: MINIMAL_NODES});
        this.__headerTextEditorInitialState = dataset.headerTextEditorInitialState;
        if (!this.__headerTextEditorInitialState) {
            const initialHtml = dataset.header ? `<p>${dataset.header}</p>` : null;
            this.__headerTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }

        this.__subheaderTextEditor = dataset.subheaderTextEditor || createEditor({nodes: MINIMAL_NODES});
        this.__subheaderTextEditorInitialState = dataset.subheaderTextEditorInitialState;
        if (!this.__subheaderTextEditorInitialState) {
            const initialHtml = dataset.subheader ? `<p>${dataset.subheader}</p>` : null;
            this.__subheaderTextEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__disclaimerTextEditor) {
            this.__disclaimerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__disclaimerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
                json.disclaimer = cleanedHtml;
            });
        }

        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
                json.header = cleanedHtml;
            });
        }

        if (this.__subheaderTextEditor) {
            this.__subheaderTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__subheaderTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
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

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <SignupNodeComponent
                    backgroundImageSrc={this.getBackgroundImageSrc()}
                    buttonPlaceholder={'Add button text'}
                    buttonText={this.getButtonText()}
                    disclaimer={this.getDisclaimer()}
                    disclaimerPlaceholder={'Enter disclaimer text'}
                    disclaimerTextEditor={this.__disclaimerTextEditor}
                    disclaimerTextEditorInitialState={this.__disclaimerTextEditorInitialState}
                    header={this.getHeader()}
                    headerPlaceholder={'Enter heading'}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
                    labels={this.getLabels()}
                    nodeKey={this.getKey()}
                    subheader={this.getSubheader()}
                    subheaderPlaceholder={'Enter subheading text'}
                    subheaderTextEditor={this.__subheaderTextEditor}
                    subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
                    type={this.getStyle()}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__headerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isSubHtmlEmpty = this.__subheaderTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isDisclaimerEmpty = this.__disclaimerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && isSubHtmlEmpty && isDisclaimerEmpty && !this.__buttonText && !this.__backgroundImageSrc;
    }
}

export const $createSignupNode = (dataset) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node) {
    return node instanceof SignupNode;
}
