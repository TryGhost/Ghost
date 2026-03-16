import HeaderCardIcon from '../assets/icons/kg-card-type-header.svg?react';
import HeaderNodeComponent from './header/v2/HeaderNodeComponent';
import HeaderNodeComponentV1 from './header/v1/HeaderNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {HeaderNode as BaseHeaderNode, normalizeCardWidth, type CardWidth, type HeaderData} from '@tryghost/kg-default-nodes';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';
import type {LexicalEditor} from 'lexical';

type Alignment = 'left' | 'center';
type BackgroundSize = 'cover' | 'contain';
type Layout = 'regular' | 'wide' | 'full' | 'split';
type HeaderSize = 'small' | 'medium' | 'large';
type HeaderStyle = 'dark' | 'light' | 'accent' | 'image';

export type HeaderNodeData = HeaderData & {
    headerTextEditor?: LexicalEditor;
    headerTextEditorInitialState?: unknown;
    subheaderTextEditor?: LexicalEditor;
    subheaderTextEditorInitialState?: unknown;
};

interface HeaderMenuConfig {
    deprecated?: {
        headerV1?: boolean;
    };
}

export const INSERT_HEADER_COMMAND = createCommand<HeaderNodeData>();

export class HeaderNode extends BaseHeaderNode {
    __headerTextEditor!: LexicalEditor;
    __subheaderTextEditor!: LexicalEditor;
    __headerTextEditorInitialState: unknown;
    __subheaderTextEditorInitialState: unknown;

    // We keep Header v1 here for testing and backwards compatibility
    // we keep it hidden in the Menu in Ghost but visible in the Demo to ensure it remains tested till we full deprecate it in the future
    static kgMenu = [
        {
            label: 'Header1',
            desc: 'Add a header',
            Icon: HeaderCardIcon,
            insertCommand: INSERT_HEADER_COMMAND,
            matches: ['v1_header', 'v1_heading'],
            priority: 11,
            insertParams: () => ({
                version: 1
            }),
            isHidden: ({config}: {config?: HeaderMenuConfig}) => {
                return config?.deprecated?.headerV1 ?? true;
            },
            shortcut: '/header'
        },
        {
            label: 'Header',
            desc: 'Add a header',
            Icon: HeaderCardIcon,
            insertCommand: INSERT_HEADER_COMMAND,
            matches: ['header', 'heading'],
            priority: 11,
            insertParams: () => ({
                version: 2
            }),
            shortcut: '/header'
        }
    ];

    getIcon() {
        return HeaderCardIcon;
    }

    constructor(dataset: HeaderNodeData = {}, key?: string) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__subheaderTextEditor', {editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `${dataset.header}`); // we serialize with no wrapper
        }
        if (!dataset.subheaderTextEditor && dataset.subheader) {
            populateNestedEditor(this, '__subheaderTextEditor', `${dataset.subheader}`); // we serialize with no wrapper
        }
    }

    exportJSON() {
        const json = super.exportJSON();

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

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headerTextEditor = self.__headerTextEditor;
        dataset.subheaderTextEditor = self.__subheaderTextEditor;
        return dataset;
    }

    getCardWidth(): CardWidth | undefined {
        const version = this.version;

        if (version === 1) {
            return 'full';
        }

        if (version === 2) {
            const layout = this.layout;
            return normalizeCardWidth(layout === 'split' ? 'full' : layout);
        }
    }

    decorate() {
        // for backwards compatibility with v1 cards
        if (this.version === 1) {
            return (
                <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                    <HeaderNodeComponentV1
                        backgroundImageSrc={this.backgroundImageSrc}
                        button={this.buttonEnabled}
                        buttonText={this.buttonText}
                        buttonUrl={this.buttonUrl}
                        header={this.header}
                        headerTextEditor={this.__headerTextEditor}
                        headerTextEditorInitialState={this.__headerTextEditorInitialState as string | undefined}
                        nodeKey={this.getKey()}
                        size={this.size as HeaderSize}
                        subheader={this.subheader}
                        subheaderTextEditor={this.__subheaderTextEditor}
                        subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState as string | undefined}
                        type={this.style as HeaderStyle}
                    />
                </KoenigCardWrapper>
            );
        }

        if (this.version === 2) {
            return (
                <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                    <HeaderNodeComponent
                        accentColor={this.accentColor}
                        alignment={this.alignment as Alignment}
                        backgroundColor={this.backgroundColor}
                        backgroundImageHeight={this.backgroundImageHeight}
                        backgroundImageSrc={this.backgroundImageSrc}
                        backgroundImageWidth={this.backgroundImageWidth}
                        backgroundSize={this.backgroundSize as BackgroundSize}
                        buttonColor={this.buttonColor}
                        buttonEnabled={this.buttonEnabled}
                        buttonText={this.buttonText}
                        buttonTextColor={this.buttonTextColor}
                        buttonUrl={this.buttonUrl}
                        header={this.header}
                        headerTextEditor={this.__headerTextEditor}
                        headerTextEditorInitialState={this.__headerTextEditorInitialState as string | undefined}
                        isSwapped={this.swapped}
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
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__headerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isSubHtmlEmpty = this.__subheaderTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && isSubHtmlEmpty && (!this.buttonEnabled || (!this.buttonText && !this.buttonUrl)) && !this.backgroundImageSrc;
    }
}

export const $createHeaderNode = (dataset: HeaderNodeData = {}) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node: unknown): node is HeaderNode {
    return node instanceof HeaderNode;
}
