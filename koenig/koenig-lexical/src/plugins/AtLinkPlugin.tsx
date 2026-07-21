import KoenigComposerContext from '../context/KoenigComposerContext';
import Portal from '../components/ui/Portal';
import React from 'react';
import trackEvent from '../utils/analytics';
import {
    $createAtLinkNode,
    $createAtLinkSearchNode,
    $createZWNJNode,
    $isAtLinkNode,
    $isAtLinkSearchNode,
    $isZWNJNode,
    AtLinkNode,
    AtLinkSearchNode
} from '@tryghost/kg-default-nodes';
import {$createBookmarkNode} from '../nodes/BookmarkNode';
import {$createLinkNode} from '@lexical/link';
import {
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $nodesOfType,
    COMMAND_PRIORITY_HIGH,
    DELETE_CHARACTER_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    KEY_ESCAPE_COMMAND,
    PASTE_COMMAND
} from 'lexical';
import {$insertFirst, mergeRegister} from '@lexical/utils';
import {AtLinkResultsPopup} from '../components/ui/AtLinkResultsPopup';
import {isInternalUrl} from '../utils/isInternalUrl';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useSearchLinks} from '../hooks/useSearchLinks';
import type {LexicalNode} from 'lexical';

function $removeAtLink(node: unknown, {focus = false} = {}) {
    if (!$isAtLinkNode(node)) {

        console.warn('$removeAtLink called on a non-at-link node', node);
        return;
    }

    const searchNode = node.getChildAtIndex(1);
    if (!searchNode) {
        return;
    }

    const textNode = $createTextNode('@' + searchNode.getTextContent());
    textNode.setFormat(node.getLinkFormat() ?? 0);
    node.replace(textNode);

    if (focus) {
        textNode.selectEnd();
    }
}

function noResultOptions() {
    return [{
        label: 'No results found',
        items: []
    }];
}

// Manages at-link search nodes and display of the search results panel when appropriate
export const KoenigAtLinkPlugin = ({searchLinks, siteUrl}: {searchLinks: (term?: string) => Promise<unknown>; siteUrl?: string}) => {
    const [editor] = useLexicalComposerContext();
    const [focusedAtLinkNode, setFocusedAtLinkNode] = React.useState<AtLinkNode | null>(null);
    const [query, setQuery] = React.useState('');
    const searchOptions = React.useMemo(() => ({noResultOptions}), []);
    const {isSearching, listOptions} = useSearchLinks(query, searchLinks, searchOptions);

    // register an event listener to detect '@' character being typed
    // - we only ever want to convert an '@' to an at-link node when it's typed
    //   so a native event listener makes more sense than a lexical update listener
    //   that would need to constantly compare against current and previous states
    // - '@' must be preceded by beginning of line, whitespace, or br
    // - '@' must be followed by whitespace, end of line, or br
    React.useEffect(() => {
        const rootElement = editor.getRootElement();

        const handleAtInsert = (event: Event & {isComposing?: boolean; inputType?: string; data?: string | null}) => {
            if (event.isComposing) {
                return;
            }

            if (event.inputType === 'insertText' && event.data === '@') {
                let replaceAt = false;

                editor.getEditorState().read(() => {
                    // get the current selection
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                        return;
                    }

                    const anchor = selection.anchor;
                    if (anchor.type !== 'text') {
                        return;
                    }

                    const anchorNode = anchor.getNode();
                    if (!anchorNode.isSimpleText()) {
                        return;
                    }

                    const anchorOffset = anchor.offset;
                    let textBeforeAnchor = anchorNode.getTextContent().slice(0, anchorOffset);
                    let textAfterAnchor = anchorNode.getTextContent().slice(anchorOffset);

                    // adjust before/after text if we're immediately preceded/followed by a text node
                    // because that content needs to be accounted for in our regex match
                    const prevSibling = anchorNode.getPreviousSibling();
                    const nextSibling = anchorNode.getNextSibling();

                    if (anchorOffset === 0 && $isTextNode(prevSibling)) {
                        textBeforeAnchor = prevSibling.getTextContent();
                    }

                    if (anchorOffset === anchorNode.getTextContent().length && $isTextNode(nextSibling)) {
                        textAfterAnchor = nextSibling.getTextContent();
                    }

                    const textBeforeRegExp = /(^|\s)@$/;
                    const textAfterRegExp = /^($|\s|\.)/;

                    if (
                        textBeforeRegExp.test(textBeforeAnchor)
                        && textAfterRegExp.test(textAfterAnchor)
                    ) {
                        replaceAt = true;
                    }
                });

                if (replaceAt) {
                    editor.update(() => {
                        // selection should now be where the '@' character was
                        const selection = $getSelection();

                        // store current node's format so it can be re-applied to the eventual link node
                        if (!$isRangeSelection(selection)) {
                            return;
                        }
                        const linkFormat = selection.anchor.getNode().getFormat();

                        // delete the '@' character
                        selection.deleteCharacter(true);

                        // prep the at-link node
                        const atLinkNode = $createAtLinkNode(linkFormat ?? null);
                        atLinkNode.setLinkFormat(linkFormat);
                        const zwnjNode = $createZWNJNode();
                        atLinkNode.append(zwnjNode);
                        const atLinkSearchNode = $createAtLinkSearchNode('');
                        atLinkNode.append(atLinkSearchNode);

                        // insert it
                        selection.insertNodes([atLinkNode]);

                        // ensure we still have a cursor and it's inside the search node
                        atLinkNode.select(1, 1);

                        const searchNode = atLinkNode.getChildAtIndex(1);
                        const rangeSelection = $getSelection();
                        if ($isRangeSelection(rangeSelection) && searchNode) {
                            rangeSelection.anchor.set(searchNode.getKey(), 0, 'element');
                            rangeSelection.focus.set(searchNode.getKey(), 0, 'element');
                        }
                    });
                }
            }
        };

        // weirdly the 'input' event doesn't fire for the first character typed in a paragraph
        const handleAtBeforeInput = (event: Event & {inputType?: string; data?: string | null}) => {
            if (event.inputType === 'insertText' && event.data === '@') {
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection) && selection.isCollapsed() && !selection.anchor.getNode().getPreviousSibling()) {
                        handleAtInsert(event);
                    }
                });
            }
        };

        if (!rootElement) {
            return;
        }
        rootElement.addEventListener('input', handleAtInsert);
        rootElement.addEventListener('beforeinput', handleAtBeforeInput);

        return () => {
            rootElement.removeEventListener('input', handleAtInsert);
            rootElement.removeEventListener('beforeinput', handleAtBeforeInput);
        };
    }, [editor]);

    // register an update listener
    // - update plugin state with a focused at-link node
    // - update plugin state with search query based on at-link-search node text content
    // - remove at-link nodes when they don't have focus (i.e. using arrow keys to move out of them)
    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            // do nothing if we're in the middle of composing text
            if (editor.isComposing()) {
                return;
            }

            editor.update(() => {
                const atLinkNodes = $nodesOfType(AtLinkNode);
                const selection = $getSelection();

                // we don't have a normal selection so we don't have a cursor inside
                // an at-link node, remove all of them
                if (!$isRangeSelection(selection)) {
                    atLinkNodes.forEach((node: LexicalNode) => $removeAtLink(node));
                    setFocusedAtLinkNode(null);
                    setQuery('');
                    return;
                }

                // we have a collapsed selection, remove any at-link nodes that don't have focus
                // handles cursor movement out of at-link nodes
                if (selection.isCollapsed()) {
                    const anchorNode = selection.anchor.getNode();
                    let selectedAtLinkNode: AtLinkNode | null = null;

                    if ($isAtLinkNode(anchorNode)) {
                        selectedAtLinkNode = anchorNode;
                    }
                    if ($isAtLinkNode(anchorNode.getParent())) {
                        selectedAtLinkNode = anchorNode.getParent() as AtLinkNode;
                    }

                    atLinkNodes.forEach((atLinkNode) => {
                        if (atLinkNode !== selectedAtLinkNode) {
                            $removeAtLink(atLinkNode);
                        }
                    });

                    if (selectedAtLinkNode) {
                        // search node is focused, update our search query
                        setFocusedAtLinkNode(selectedAtLinkNode);

                        // at-link nodes always have a ZWNJ node followed by an at-link-search node
                        const searchNode = selectedAtLinkNode.getChildAtIndex(1);
                        const searchNodeText = searchNode?.getTextContent?.();

                        setQuery(searchNodeText ?? '');

                        // normalize selection to be inside the search node when on zwnj
                        // - handles case where text is backspaced to empty
                        if ($isZWNJNode(selection.focus.getNode()) && window.getSelection()?.anchorOffset === 0) {
                            selectedAtLinkNode.select(1, 1);
                            const rangeSelection = $getSelection();
                            if ($isRangeSelection(rangeSelection) && searchNode) {
                                rangeSelection.anchor.set(searchNode.getKey(), 0, 'element');
                                rangeSelection.focus.set(searchNode.getKey(), 0, 'element');
                            }
                        }

                        // if the search node is already empty but active, remove the at-link node on backspace
                        if (searchNodeText === '' && $isZWNJNode(selection.anchor.getNode())) {
                            $removeAtLink(selectedAtLinkNode, {focus: true});
                        }
                    } else {
                        // search node isn't focused, reset plugin state
                        setFocusedAtLinkNode(null);
                        setQuery('');
                    }

                    return;
                }

                // TODO: prevent range selection spanning outside of at-link node
            });
        });
    }, [editor]);

    // register some command handlers to avoid certain actions happening whilst
    // an at-link-search node is focused
    React.useEffect(() => {
        function $skipFormatCommandIfNeeded() {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && $isAtLinkSearchNode(selection.anchor.getNode())) {
                return true;
            }
            return false;
        }

        return mergeRegister(
            // revert to '@' when pressing escape with a focused at-link node
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const anchorNode = selection.anchor.getNode();
                        if ($isAtLinkNode(anchorNode)) {
                            $removeAtLink(anchorNode, {focus: true});
                            return true;
                        }
                        if ($isAtLinkSearchNode(anchorNode) || ($isZWNJNode(anchorNode) && $isAtLinkNode(anchorNode.getParent()))) {
                            $removeAtLink(anchorNode.getParent(), {focus: true});
                            return true;
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            // revert to '@' when backspacing or deleting chars at the beginning/end of an at-link node
            editor.registerCommand(
                DELETE_CHARACTER_COMMAND,
                (isBackward) => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const anchorNode = selection.anchor.getNode();
                        if ($isAtLinkSearchNode(anchorNode) || ($isZWNJNode(anchorNode) && $isAtLinkNode(anchorNode.getParent()))) {
                            const anchorOffset = selection.anchor.offset;
                            if (isBackward && anchorOffset === 0) {
                                $removeAtLink(anchorNode.getParent(), {focus: true});
                                return true;
                            }
                            if (!isBackward && anchorOffset === anchorNode.getTextContentSize()) {
                                $removeAtLink(anchorNode.getParent(), {focus: true});
                                return true;
                            }
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            // prevent formatting commands when an at-link-search node is focused
            editor.registerCommand(
                FORMAT_TEXT_COMMAND,
                $skipFormatCommandIfNeeded,
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                FORMAT_ELEMENT_COMMAND,
                $skipFormatCommandIfNeeded,
                COMMAND_PRIORITY_HIGH
            ),
            // prevent paste in the search node triggering external paste handlers
            editor.registerCommand(
                PASTE_COMMAND,
                (clipboardEvent: ClipboardEvent) => {
                    const selection = $getSelection();

                    if (!selection || !$isRangeSelection(selection) || document.activeElement !== editor.getRootElement()) {
                        return false;
                    }

                    const anchorNode = selection.anchor.getNode();
                    if ($isAtLinkNode(anchorNode) || $isAtLinkSearchNode(anchorNode)) {
                        clipboardEvent.preventDefault();

                        const atLinkSearchNode = $isAtLinkSearchNode(anchorNode) ? anchorNode : (anchorNode as AtLinkNode).getChildAtIndex(1);
                        const text = clipboardEvent.clipboardData?.getData('text/plain');

                        if (text && atLinkSearchNode && $isAtLinkSearchNode(atLinkSearchNode)) {
                            atLinkSearchNode.setTextContent(atLinkSearchNode.getTextContent() + text);
                            atLinkSearchNode.selectEnd();
                        }

                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    });

    // register transforms to ensure at-link node trees are valid
    React.useEffect(() => {
        return editor.registerNodeTransform(AtLinkNode, (atLinkNode) => {
            // first child should always be a ZWNJ
            if (!$isZWNJNode(atLinkNode.getFirstChild())) {
                const zwnjNode = $createZWNJNode();
                $insertFirst(atLinkNode, zwnjNode);
            }

            // second child should be a search node
            if (!$isAtLinkSearchNode(atLinkNode.getChildAtIndex(1))) {
                const atLinkSearchNode = $createAtLinkSearchNode('');
                atLinkNode.append(atLinkSearchNode);
            }

            // we only want one search node, remove or replace any non-search nodes
            atLinkNode.getChildren().forEach((child: LexicalNode, index: number) => {
                if (index > 0 && !$isAtLinkSearchNode(child)) {
                    const text = child.getTextContent?.();

                    if (!text) {
                        child.remove();
                    } else {
                        const atLinkSearchNode = $createAtLinkSearchNode(text);
                        child.replace(atLinkSearchNode);
                    }
                }
            });

            // consolidate multiple search nodes from previous step into single node
            const searchNode = atLinkNode.getChildAtIndex(1);
            if (!searchNode) {
                return;
            }
            const currentText = searchNode.getTextContent();
            let consolidatedText = currentText;
            atLinkNode.getChildren().forEach((child: LexicalNode, index: number) => {
                if (index > 1) {
                    consolidatedText += child.getTextContent();
                    child.remove();
                }
            });
            if (consolidatedText !== currentText && $isAtLinkSearchNode(searchNode)) {
                searchNode.setTextContent(consolidatedText);
            }
        });
    }, [editor]);

    // when a search result is selected, replace the at-link node with a link node
    const onItemSelect = React.useCallback((rawItem: unknown) => {
        const item = rawItem as {value?: string; label?: string; type?: string};
        editor.update(() => {
            if (!item?.value || !focusedAtLinkNode) {
                $removeAtLink(focusedAtLinkNode, {focus: true});
                return;
            }

            const parent = focusedAtLinkNode.getParent();
            if (!parent) {
                return;
            }
            // we have to get the children nodes
            const children = parent.getChildren();

            const isTextLink = (children.length !== 1 || !$isAtLinkNode(children[0]));

            if (isTextLink) {
                const linkNode = $createLinkNode(item.value!);
                const textNode = $createTextNode(item.label ?? '');
                // getLinkFormat() is a TextNode format bitmask captured from the
                // text the at-link was created in, so apply it to the text node
                // (an element's setFormat expects an alignment string, not a bitmask)
                textNode.setFormat(focusedAtLinkNode.getLinkFormat() ?? 0);
                linkNode.append(textNode);

                focusedAtLinkNode.replace(linkNode);
                linkNode.selectEnd();

                setQuery('');
                setFocusedAtLinkNode(null);
            } else {
                const bookmarkNode = $createBookmarkNode({
                    url: item.value,
                    title: item.label
                });
                focusedAtLinkNode.replace(bookmarkNode);
                bookmarkNode.selectEnd();
            }

            if (item.type === 'internal' || item.type === 'default') {
                trackEvent('Link dropdown: Internal link chosen', {context: 'at-link', fromLatest: item.type === 'default', isBookmark: !isTextLink});
            } else {
                const linkTarget = isInternalUrl(item.value ?? '', siteUrl ?? '') ? 'internal' : 'external';
                trackEvent('Link dropdown: URL entered', {context: 'at-link', target: linkTarget, isBookmark: !isTextLink});
            }
        });
    }, [editor, focusedAtLinkNode, siteUrl]);

    // render nothing when we don't have a focused at-link node
    if (!focusedAtLinkNode) {
        return null;
    }

    // otherwise render search results popup
    return (
        <Portal data-testid="at-link-popup">
            <AtLinkResultsPopup
                atLinkNode={focusedAtLinkNode}
                isSearching={isSearching}
                listOptions={listOptions}
                query={query}
                onSelect={onItemSelect}
            />
        </Portal>
    );
};

// wrapping KoenigAtLinkPlugin means we can ensure all dependencies are available
// before rendering the plugin, avoiding complex conditionals in the plugin itself
export const AtLinkPlugin = () => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();

    // do nothing if we haven't been passed a way to search internal links
    const enabled = typeof cardConfig?.searchLinks === 'function';
    if (!enabled) {
        return null;
    }

    // do nothing if the required nodes aren't loaded
    if (!editor.hasNodes([AtLinkNode, AtLinkSearchNode])) {
        return null;
    }

    return <KoenigAtLinkPlugin searchLinks={cardConfig.searchLinks as (term?: string) => Promise<unknown>} siteUrl={cardConfig.siteUrl} />;
};

export default AtLinkPlugin;
