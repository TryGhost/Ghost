import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getNodeByKey, createEditor} from 'lexical';
import {$generateHtmlFromNodes} from '@lexical/html';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {EmbedNode as BaseEmbedNode, INSERT_EMBED_COMMAND} from '@tryghost/kg-default-nodes';
import {EmbedCard} from '../components/ui/cards/EmbedCard';
import {ReactComponent as EmbedCardIcon} from '../assets/icons/kg-card-type-other.svg';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_EMBED_COMMAND} from '@tryghost/kg-default-nodes';

function EmbedNodeComponent({nodeKey, url, html, embedType, metadata, captionEditor, captionEditorInitialState}) {
    const [editor] = useLexicalComposerContext();

    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected, isEditing} = React.useContext(CardContext);
    const [urlInputValue, setUrlInputValue] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [urlError, setUrlError] = React.useState(false);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleUrlChange = (event) => {
        setUrlInputValue(event.target.value);
    };

    const handleUrlInput = async (event) => {
        fetchMetadata(event.target.value);
    };

    const handleRetry = async () => {
        setUrlError(false);
    };

    const handlePasteAsLink = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            const paragraph = $createParagraphNode()
                .append($createLinkNode(urlInputValue)
                    .append($createTextNode(urlInputValue)));
            node.replace(paragraph);
            paragraph.selectEnd();
        });
    };

    const handleClose = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.remove();
        });
    };

    async function fetchMetadata(href) {
        setLoading(true);
        let response;
        try {
            // set the test data return values in fetchEmbed.js
            response = await cardConfig.fetchEmbed(href);
        } catch (e) {
            setLoading(false);
            setUrlError(true);
            return;
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setUrl(response.url);
            node.setEmbedType(response.type);
            node.setHtml(response.html);
            node.setMetadata(response.metadata);
        });
        setLoading(false);
    }

    return (
        <>
            <EmbedCard
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                handleClose={handleClose}
                handlePasteAsLink={handlePasteAsLink}
                handleRetry={handleRetry}
                handleUrlChange={handleUrlChange}
                handleUrlInput={handleUrlInput}
                html={html}
                isLoading={loading}
                isSelected={isSelected}
                metadata={metadata}
                url={url}
                urlError={urlError}
                urlInputValue={urlInputValue}
                urlPlaceholder={`Paste URL to add embedded content...`}
            />
            <ActionToolbar
                data-kg-card-toolbar="embed"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="embed"
                isVisible={html && isSelected && !isEditing && !showSnippetToolbar && cardConfig.createSnippet}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export class EmbedNode extends BaseEmbedNode {
    __captionEditor;
    __captionEditorInitialState;

    static kgMenu = [{
        label: 'Embed',
        desc: 'Embed a link as a visual embed',
        Icon: EmbedCardIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        matches: ['embed']
    }];

    getIcon() {
        return EmbedCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up and populate nested editors from the serialized HTML
        this.__captionEditor = dataset.captionEditor || createEditor({nodes: MINIMAL_NODES});
        this.__captionEditorInitialState = dataset.captionEditorInitialState;

        if (!this.__captionEditorInitialState) {
            // wrap the caption in a paragraph so it gets parsed correctly
            // - we serialize with no wrapper so the renderer can decide how to wrap it
            const initialHtml = dataset.caption ? `<p>${dataset.caption}</p>` : null;

            // store the initial state separately as it's passed in to `<CollaborationPlugin />`
            // for use when there is no YJS document already stored
            this.__captionEditorInitialState = generateEditorState({
                // create a new editor instance so we don't pre-fill an editor that will be filled by YJS content
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }
    }

    createDOM() {
        return document.createElement('div');
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    updateDOM() {
        return false;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <EmbedNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    embedType={this.__embedType}
                    html={this.__html}
                    metadata={this.__metadata}
                    nodeKey={this.getKey()}
                    url={this.__url}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createEmbedNode = (dataset) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node) {
    return node instanceof EmbedNode;
}
