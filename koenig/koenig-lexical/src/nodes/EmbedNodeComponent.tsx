import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$createBookmarkNode} from './BookmarkNode';
import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getNodeByKey, $isParagraphNode} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {EmbedCard} from '../components/ui/cards/EmbedCard';
import {SHOW_CARD_VISIBILITY_SETTINGS_COMMAND} from '../plugins/KoenigBehaviourPlugin.jsx';
import {SettingsPanel} from '../components/ui/SettingsPanel.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {VisibilitySettings} from '../components/ui/VisibilitySettings.jsx';
import {useCallback} from 'react';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.jsx';

export function EmbedNodeComponent({nodeKey, url, html, createdWithUrl, embedType, metadata, captionEditor, captionEditorInitialState}) {
    const [editor] = useLexicalComposerContext();

    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const [urlInputValue, setUrlInputValue] = React.useState('');
    const {showVisibilitySettings} = useKoenigSelectedCardContext();
    const {isVisibilityEnabled, visibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

    const visibilitySettingsTabs = [
        {id: 'visibility', label: 'Visibility'}
    ];

    const handleVisibilityToggle = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, {cardKey: nodeKey});
    }, [editor, nodeKey]);

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
        setLoading(true);
        let response;
        try {
            // set the test data return values in fetchEmbed.js
            response = await cardConfig.fetchEmbed(href, {});
            // we may end up with a bookmark return if the url is valid but doesn't return an embed
            if (response.type === 'bookmark') {
                editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    const bookmarkNode = $createBookmarkNode({url: response.url, metadata: response.metadata});
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
            node.url = href;
            node.metadata = response;
            node.embedType = response.type;
            node.html = response.html;

            // select next node if card was pasted from link
            if (createdWithUrl) {
                node.selectNext();
            }
        });
        setLoading(false);
        // We only do this for init

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
                isVisible={html && isSelected && !showSnippetToolbar && (cardConfig.createSnippet || isVisibilityEnabled)}
            >
                <ToolbarMenu>
                    {isVisibilityEnabled && (
                        <ToolbarMenuItem
                            dataTestId="show-visibility"
                            icon="visibility"
                            isActive={showVisibilitySettings}
                            label="Visibility"
                            onClick={handleVisibilityToggle}
                        />
                    )}
                    <ToolbarMenuSeparator hide={!isVisibilityEnabled || !cardConfig.createSnippet} />
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

            {isVisibilityEnabled && showVisibilitySettings && isSelected && (
                <SettingsPanel
                    darkMode={darkMode}
                    defaultTab="visibility"
                    tabs={visibilitySettingsTabs}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    {{
                        visibility: (
                            <VisibilitySettings
                                toggleVisibility={toggleVisibility}
                                visibilityOptions={visibilityOptions}
                            />
                        )
                    }}
                </SettingsPanel>
            )}
        </>
    );
}
