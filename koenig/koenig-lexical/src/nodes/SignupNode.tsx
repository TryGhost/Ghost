import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import SignupCardIcon from '../assets/icons/kg-card-type-signup.svg?react';
import SignupNodeComponent from './SignupNodeComponent';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {SignupNode as BaseSignupNode, normalizeCardWidth, type CardWidth, type SignupData} from '@tryghost/kg-default-nodes';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';
import type {LexicalEditor} from 'lexical';

type Alignment = 'left' | 'center';
type BackgroundSize = 'cover' | 'contain';
type Layout = 'regular' | 'wide' | 'full' | 'split';

export type SignupNodeData = SignupData & {
    disclaimerTextEditor?: LexicalEditor;
    disclaimerTextEditorInitialState?: unknown;
    headerTextEditor?: LexicalEditor;
    headerTextEditorInitialState?: unknown;
    subheaderTextEditor?: LexicalEditor;
    subheaderTextEditorInitialState?: unknown;
};

interface SignupMenuConfig {
    membersEnabled?: boolean;
    siteDescription?: string;
    siteTitle?: string;
}

export const INSERT_SIGNUP_COMMAND = createCommand<SignupNodeData>();

export class SignupNode extends BaseSignupNode {
    __disclaimerTextEditor!: LexicalEditor;
    __disclaimerTextEditorInitialState: unknown;
    __headerTextEditor!: LexicalEditor;
    __headerTextEditorInitialState: unknown;
    __subheaderTextEditor!: LexicalEditor;
    __subheaderTextEditorInitialState: unknown;

    static kgMenu = {
        label: 'Signup',
        desc: 'Convert visitors into members',
        Icon: SignupCardIcon,
        insertCommand: INSERT_SIGNUP_COMMAND,
        matches: ['signup', 'subscribe'],
        priority: 10,
        isHidden: ({config}: {config?: SignupMenuConfig}) => {
            const isMembersEnabled = config?.membersEnabled;
            return !(isMembersEnabled);
        },
        insertParams: ({config}: {config?: SignupMenuConfig}) => ({
            header: config?.siteTitle ? `Sign up for ${config.siteTitle}` : '',
            subheader: config?.siteDescription || '',
            disclaimer: 'No spam. Unsubscribe anytime.'
        }),
        shortcut: '/signup'
    };

    getIcon() {
        return SignupCardIcon;
    }

    constructor(dataset: SignupNodeData = {}, key?: string) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__subheaderTextEditor', {editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__disclaimerTextEditor', {editor: dataset.disclaimerTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `${dataset.header}`);
        }

        // populate nested editors on initial construction
        if (!dataset.subheaderTextEditor && dataset.subheader) {
            populateNestedEditor(this, '__subheaderTextEditor', `${dataset.subheader}`);
        }

        // populate nested editors on initial construction
        if (!dataset.disclaimerTextEditor && dataset.disclaimer) {
            populateNestedEditor(this, '__disclaimerTextEditor', `${dataset.disclaimer}`);
        }
    }

    exportJSON() {
        const json: ReturnType<BaseSignupNode['exportJSON']> & {disclaimer?: string; header?: string; subheader?: string} = super.exportJSON();

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
        const dataset: ReturnType<BaseSignupNode['getDataset']> & {disclaimerTextEditor?: LexicalEditor; headerTextEditor?: LexicalEditor; subheaderTextEditor?: LexicalEditor} = super.getDataset();
        const self = this.getLatest();

        dataset.disclaimerTextEditor = self.__disclaimerTextEditor;
        dataset.headerTextEditor = self.__headerTextEditor;
        dataset.subheaderTextEditor = self.__subheaderTextEditor;

        return dataset;
    }

    getCardWidth(): CardWidth | undefined {
        const layout = this.layout;
        return normalizeCardWidth(layout === 'split' ? 'full' : layout);
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                <SignupNodeComponent
                    alignment={this.alignment as Alignment}
                    backgroundColor={this.backgroundColor}
                    backgroundImageSrc={this.backgroundImageSrc}
                    backgroundSize={this.backgroundSize as BackgroundSize}
                    buttonColor={this.buttonColor}
                    buttonText={this.buttonText}
                    buttonTextColor={this.buttonTextColor}
                    disclaimer={this.disclaimer}
                    disclaimerTextEditor={this.__disclaimerTextEditor}
                    disclaimerTextEditorInitialState={this.__disclaimerTextEditorInitialState as string | undefined}
                    header={this.header}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState as string | undefined}
                    isSwapped={this.swapped}
                    labels={this.labels}
                    layout={this.layout as Layout}
                    nodeKey={this.getKey()}
                    subheader={this.subheader}
                    subheaderTextEditor={this.__subheaderTextEditor}
                    subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState as string | undefined}
                    textColor={this.textColor}
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
            !this.labels.length &&
            isSubheaderEmpty;
    }
}

export const $createSignupNode = (dataset: SignupNodeData = {}) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node: unknown): node is SignupNode {
    return node instanceof SignupNode;
}
