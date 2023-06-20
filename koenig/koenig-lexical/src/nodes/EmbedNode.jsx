import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$createBookmarkNode} from './BookmarkNode';
import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getNodeByKey} from 'lexical';
import {$generateHtmlFromNodes} from '@lexical/html';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {EmbedNode as BaseEmbedNode, INSERT_EMBED_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as CodePenIcon} from '../assets/icons/kg-card-type-codepen.svg';
import {EmbedCard} from '../components/ui/cards/EmbedCard';
import {ReactComponent as EmbedCardIcon} from '../assets/icons/kg-card-type-other.svg';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ReactComponent as SoundCloudIcon} from '../assets/icons/kg-card-type-soundcloud.svg';
import {ReactComponent as SpotifyIcon} from '../assets/icons/kg-card-type-spotify.svg';
import {ToolbarMenu, ToolbarMenuItem} from '../components/ui/ToolbarMenu.jsx';
import {ReactComponent as TwitterIcon} from '../assets/icons/kg-card-type-twitter.svg';
import {ReactComponent as VimeoIcon} from '../assets/icons/kg-card-type-vimeo.svg';
import {ReactComponent as YouTubeIcon} from '../assets/icons/kg-card-type-youtube.svg';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';
import {useCallback} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_EMBED_COMMAND} from '@tryghost/kg-default-nodes';

function EmbedNodeComponent({nodeKey, url, html, createdWithUrl, embedType, metadata, captionEditor, captionEditorInitialState}) {
    const [editor] = useLexicalComposerContext();

    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const [urlInputValue, setUrlInputValue] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [urlError, setUrlError] = React.useState(false);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleUrlChange = (event) => {
        setUrlInputValue(event.target.value);
    };

    const handleUrlSubmit = async (event) => {
        if (event.key === 'Enter') {
            fetchMetadata(event.target.value);
        }
    };

    const handleRetry = async () => {
        setUrlError(false);
    };

    const handlePasteAsLink = useCallback((href) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!node) {
                return;
            }
            const paragraph = $createParagraphNode()
                .append($createLinkNode(href)
                    .append($createTextNode(href)));
            node.replace(paragraph);

            if (!paragraph.getNextSibling()) {
                paragraph.insertAfter($createParagraphNode());
            }
            paragraph.selectNext();
        });
    }, [editor, nodeKey]);

    const handleClose = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.remove();
        });
    };

    const fetchMetadata = async (href) => {
        setLoading(true);
        let response;
        const type = createdWithUrl ? '' : 'embed';
        try {
            // set the test data return values in fetchEmbed.js
            response = await cardConfig.fetchEmbed(href, {type});
            // we may end up with a bookmark return if the url is valid but doesn't return an embed
            if (response.type === 'bookmark') {
                editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    const bookmarkNode = $createBookmarkNode({url: response.url});
                    node.replace(bookmarkNode);
                });
                return;
            }
        } catch (e) {
            if (createdWithUrl) {
                setLoading(false);
                handlePasteAsLink(href);

                return;
            }
            setLoading(false);
            setUrlError(true);
            return;
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setUrl(href);
            node.setMetadata(response);
            node.setEmbedType(response.type);
            node.setHtml(response.html);

            // select next node if card was pasted from link
            if (createdWithUrl) {
                node.selectNext();
            }
        });
        setLoading(false);
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    };

    React.useEffect(() => {
        if (createdWithUrl) {
            // keep value in sync in case the user goes to retry to paste as link
            setUrlInputValue(url);
            try {
                fetchMetadata(url);
            } catch {
                handlePasteAsLink(url);
            }
        }
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <EmbedCard
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                handleClose={handleClose}
                handlePasteAsLink={handlePasteAsLink}
                handleRetry={handleRetry}
                handleUrlChange={handleUrlChange}
                handleUrlSubmit={handleUrlSubmit}
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
                isVisible={html && isSelected && !showSnippetToolbar && cardConfig.createSnippet}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Create snippet"
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
    __createdWithUrl;

    static kgMenu = [{
        section: 'Embed',
        label: 'Other...',
        desc: '/embed [url]',
        Icon: EmbedCardIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        matches: ['embed'],
        queryParams: ['url'],
        priority: 100
    },
    {
        section: 'Embed',
        label: 'YouTube',
        desc: '/youtube [video url]',
        Icon: YouTubeIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['youtube'],
        priority: 1
    },
    {
        section: 'Embed',
        label: 'Twitter',
        desc: '/twitter [tweet url]',
        Icon: TwitterIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['twitter'],
        priority: 2
    },
    {
        section: 'Embed',
        label: 'Vimeo',
        desc: '/vimeo [video url]',
        Icon: VimeoIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['vimeo'],
        priority: 4
    },
    {
        section: 'Embed',
        label: 'CodePen',
        desc: '/codepen [pen url]',
        Icon: CodePenIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['codepen'],
        priority: 5
    },
    {
        section: 'Embed',
        label: 'Spotify',
        desc: '/spotify [track or playlist url]',
        Icon: SpotifyIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['spotify'],
        priority: 6
    },
    {
        section: 'Embed',
        label: 'SoundCloud',
        desc: '/soundcloud [track or playlist url]',
        Icon: SoundCloudIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['soundcloud'],
        priority: 7
    }];

    getIcon() {
        return EmbedCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        this.__createdWithUrl = !!dataset.url;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `<p>${dataset.caption}</p>`); // we serialize with no wrapper
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
                    createdWithUrl={this.__createdWithUrl}
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
