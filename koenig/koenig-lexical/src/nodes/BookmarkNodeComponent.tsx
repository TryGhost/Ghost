import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React, {useCallback} from 'react';
import trackEvent from '../utils/analytics.js';
import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getNodeByKey, $isParagraphNode} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {BookmarkCard} from '../components/ui/cards/BookmarkCard.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem} from '../components/ui/ToolbarMenu.jsx';
import {isInternalUrl} from '../utils/isInternalUrl.js';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function BookmarkNodeComponent({author, nodeKey, url, icon, title, description, publisher, thumbnail, captionEditor, captionEditorInitialState, createdWithUrl}) {
    const [editor] = useLexicalComposerContext();

    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const [urlInputValue, setUrlInputValue] = React.useState(url);
    const [loading, setLoading] = React.useState(false);
    const [urlError, setUrlError] = React.useState(false);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleUrlChange = (eventOrUrl) => {
        // TODO: change this so we only get given URL strings - child components should handle their own events
        if (typeof eventOrUrl === 'string') {
            setUrlInputValue(eventOrUrl);
            return;
        }
        setUrlInputValue(eventOrUrl.target.value);
    };

    const handleUrlSubmit = async (eventOrUrl, type) => {
        if (!eventOrUrl) {
            return;
        }

        // TODO: change this so we only get given URL strings - child components should handle their own events
        if (typeof eventOrUrl === 'string') {
            if (type === 'internal' || type === 'default') {
                trackEvent('Link dropdown: Internal link chosen', {context: 'bookmark', fromLatest: type === 'default'});
            }
            if (type === 'url') {
                const target = isInternalUrl(eventOrUrl, cardConfig?.siteUrl) ? 'internal' : 'external';
                trackEvent('Link dropdown: URL entered', {context: 'bookmark', target});
            }

            fetchMetadata(eventOrUrl);
        }

        if (eventOrUrl?.key === 'Enter') {
            fetchMetadata(eventOrUrl.target.value);
        }
    };

    const handleRetry = async () => {
        setUrlError(false);
    };

    const handlePasteAsLink = useCallback(() => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            const paragraph = $createParagraphNode()
                .append($createLinkNode(urlInputValue)
                    .append($createTextNode(urlInputValue)));
            node.replace(paragraph);
            paragraph.selectEnd();
        });
    }, [editor, nodeKey, urlInputValue]);

    const handleClose = useCallback(() => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            const nextSibling = node.getNextSibling();
            if (nextSibling && $isParagraphNode(nextSibling) && nextSibling.getTextContentSize() === 0) {
                node.remove();
                nextSibling.selectEnd();
            } else {
                const paragraph = $createParagraphNode();
                node.replace(paragraph);
                paragraph.selectEnd();
            }
        });
    }, [editor, nodeKey]);

    const fetchMetadata = async (href) => {
        editor.getRootElement().focus({preventScroll: true}); // focus editor before causing the input element to dismount
        setLoading(true);
        let response;
        try {
            // set the test data return values in fetchEmbed.js
            response = await cardConfig.fetchEmbed(href, {type: 'bookmark'});
        } catch (e) {
            setLoading(false);
            setUrlError(true);
            return;
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.url = href;
            node.author = response.metadata.author;
            node.icon = response.metadata.icon;
            node.title = response.metadata.title;
            node.description = response.metadata.description;
            node.publisher = response.metadata.publisher;
            node.thumbnail = response.metadata.thumbnail;
        });
        setLoading(false);
    };

    const fetchMetadataEffect = useCallback(async () => {
        setLoading(true);
        let response;
        try {
            // set the test data return values in fetchEmbed.js
            response = await cardConfig.fetchEmbed(url, {type: 'bookmark'});
        } catch (e) {
            setLoading(false);
            setUrlError(true);
            return;
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.url = response.url;
            node.author = response.metadata.author;
            node.icon = response.metadata.icon;
            node.title = response.metadata.title;
            node.description = response.metadata.description;
            node.publisher = response.metadata.publisher;
            node.thumbnail = response.metadata.thumbnail;

            if (createdWithUrl) {
                node.selectNext();
            }
        });
        setLoading(false);
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // TODO: this needs to be a custom hook
    // if we create the node with a url
    //  fetch the metadata
    //  if it fails, paste as a link
    React.useEffect(() => {
        // only run this once
        if (createdWithUrl) {
            setUrlInputValue(url);
            try {
                fetchMetadataEffect(url);
            } catch {
                handlePasteAsLink(url);
            }
        }
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const searchEnabled = typeof cardConfig?.searchLinks === 'function';

    return (
        <>
            <BookmarkCard
                author={author}
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                description={description}
                handleClose={handleClose}
                handlePasteAsLink={handlePasteAsLink}
                handleRetry={handleRetry}
                handleUrlChange={handleUrlChange}
                handleUrlSubmit={handleUrlSubmit}
                icon={icon}
                isLoading={loading}
                isSelected={isSelected}
                publisher={publisher}
                searchLinks={cardConfig?.searchLinks}
                thumbnail={thumbnail}
                title={title}
                url={url}
                urlError={urlError}
                urlInputValue={urlInputValue}
                urlPlaceholder={searchEnabled ? `Paste URL or search posts and pages...` : `Paste URL to add bookmark content...`}
            />

            <ActionToolbar
                data-kg-card-toolbar="bookmark"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="bookmark"
                isVisible={title && isSelected && !showSnippetToolbar && cardConfig.createSnippet}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
