import React from 'react';
import {$createAsideNode, $isAsideNode} from '../nodes/AsideNode';
import {$createCodeBlockNode} from '../nodes/CodeBlockNode';
import {$createEmbedNode} from '../nodes/EmbedNode';
import {$createHeadingNode, $createQuoteNode, $isQuoteNode, DRAG_DROP_PASTE} from '@lexical/rich-text';
import {$createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {
    $createNodeSelection,
    $createParagraphNode,
    $createTextNode,
    $getNearestNodeFromDOMNode,
    $getNodeByKey,
    $getRoot,
    $getSelection,
    $insertNodes,
    $isDecoratorNode,
    $isElementNode,
    $isLineBreakNode,
    $isNodeSelection,
    $isParagraphNode,
    $isRangeSelection,
    $isRootNode,
    $isTextNode,
    $setSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_LOW,
    CUT_COMMAND,
    DELETE_LINE_COMMAND,
    FORMAT_TEXT_COMMAND,
    INSERT_PARAGRAPH_COMMAND,
    KEY_ARROW_DOWN_COMMAND,
    KEY_ARROW_LEFT_COMMAND,
    KEY_ARROW_RIGHT_COMMAND,
    KEY_ARROW_UP_COMMAND,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    KEY_DOWN_COMMAND,
    KEY_ENTER_COMMAND,
    KEY_ESCAPE_COMMAND,
    KEY_MODIFIER_COMMAND,
    KEY_TAB_COMMAND,
    PASTE_COMMAND,
    createCommand
} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {
    $isAtStartOfDocument,
    $isAtTopOfNode,
    $selectDecoratorNode,
    getTopLevelNativeElement
} from '../utils/';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {$isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND} from '@lexical/list';
import {$setBlocksType} from '@lexical/selection';
import {MIME_TEXT_HTML, MIME_TEXT_PLAIN, PASTE_MARKDOWN_COMMAND} from './MarkdownPastePlugin.jsx';
import {mergeRegister} from '@lexical/utils';
import {registerDefaultTransforms} from '@tryghost/kg-default-transforms';
import {shouldIgnoreEvent} from '../utils/shouldIgnoreEvent';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const INSERT_CARD_COMMAND = createCommand('INSERT_CARD_COMMAND');
export const SELECT_CARD_COMMAND = createCommand('SELECT_CARD_COMMAND');
export const DESELECT_CARD_COMMAND = createCommand('DESELECT_CARD_COMMAND');
export const EDIT_CARD_COMMAND = createCommand('EDIT_CARD_COMMAND');
export const DELETE_CARD_COMMAND = createCommand('DELETE_CARD_COMMAND');
export const PASTE_LINK_COMMAND = createCommand('PASTE_LINK_COMMAND');

const RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX = 10;
const SPECIAL_MARKUPS = {
    code: '`',
    superscript: '^',
    subscript: '~',
    strikethrough: '~~'
};

function $selectCard(editor, nodeKey) {
    const selection = $createNodeSelection();
    selection.add(nodeKey);
    $setSelection(selection);
    // selecting a decorator node does not change the
    // window selection (there's no caret) so we need
    // to manually move focus to the editor element
    if (document.activeElement !== editor.getRootElement()) {
        editor.getRootElement().focus({preventScroll: true});
    }
}

// remove empty cards when they are deselected
function $deselectCard(editor, nodeKey) {
    const cardNode = $getNodeByKey(nodeKey);
    if (cardNode?.isEmpty?.()) {
        $removeOrReplaceNodeWithParagraph(editor, cardNode);
    }
}

function $removeOrReplaceNodeWithParagraph(editor, node) {
    if ($getRoot().getLastChild().is(node)) {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.select();
    } else {
        const nextNode = node.getNextSibling();
        if ($isDecoratorNode(nextNode)) {
            $selectDecoratorNode(nextNode);
            // selecting a decorator node does not change the
            // window selection (there's no caret) so we need
            // to manually move focus to the editor element
            editor.getRootElement().focus();
        } else {
            nextNode.selectStart();
        }
    }

    node.remove();
}

function useKoenigBehaviour({editor, containerElem, cursorDidExitAtTop, isNested}) {
    const {
        selectedCardKey,
        setSelectedCardKey,
        isEditingCard,
        setIsEditingCard
    } = useKoenigSelectedCardContext();

    const isShiftPressed = React.useRef(false);

    React.useEffect(() => {
        const keyDown = (event) => {
            isShiftPressed.current = event.shiftKey;
        };

        const keyUp = (event) => {
            isShiftPressed.current = event.shiftKey;
        };

        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);

        return () => {
            document.removeEventListener('keydown', keyDown);
            document.removeEventListener('keyup', keyUp);
        };
    }, []);

    // deselect cards on mousedown outside of the editor container
    React.useEffect(() => {
        const onMousedown = (event) => {
            if (!document.body.contains(event.target)) {
                // The event target is no longer in the DOM
                // This is possible if we have listeners in the capture phase of the event (e.g. dropdowns)
                return;
            }

            // clicks outside of editor should deselect cards
            //  this more generic handling prevents the need to handle blur for codemirror cards (and likely others)
            if (containerElem.current && !containerElem.current.contains(event.target)) {
                editor.getEditorState().read(() => {
                    const selection = $getSelection();
                    if ($isNodeSelection(selection)) {
                        const selectedNode = selection.getNodes()[0];
                        if ($isKoenigCard(selectedNode)) {
                            editor.dispatchCommand(DESELECT_CARD_COMMAND, {cardKey: selectedNode.getKey()});
                        }
                    }
                });
            }
        };

        if (!isNested) {
            window.addEventListener('mousedown', onMousedown);
        }

        return () => {
            window.removeEventListener('mousedown', onMousedown);
        };
    }, [editor, containerElem, isNested]);

    // Override built-in keyboard movement around card (DecoratorNode) boundaries,
    // cards should be selected on up/down and when deleting content around them.
    // Trigger `cursorDidExitAtTop` prop if present and cursor at beginning of doc
    React.useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({editorState, tags}) => {
                // ignore updates triggered by other users or by card node exportJSON calls
                if (tags.has('collaboration') || tags.has('card-export')) {
                    return;
                }

                // ignore selections inside of nested editors otherwise we'll
                // mistakenly deselect the card containing the nested editor
                if (isNested || document.activeElement.closest('[data-lexical-decorator]')) {
                    return;
                }

                // trigger card selection/deselection when selection changes
                const {isCardSelected, cardKey, cardNode} = editorState.read(() => {
                    const selection = $getSelection();

                    const hasCardSelection = $isNodeSelection(selection) &&
                        selection.getNodes().length === 1 &&
                        $isKoenigCard(selection.getNodes()[0]);

                    if (hasCardSelection) {
                        const selectedNode = selection.getNodes()[0];
                        return {isCardSelected: true, cardKey: selectedNode.getKey(), cardNode: selectedNode};
                    } else {
                        return {isCardSelected: false};
                    }
                });

                if (isCardSelected && !selectedCardKey) {
                    setSelectedCardKey(cardKey);
                    setIsEditingCard(false);
                } else if (isCardSelected && selectedCardKey !== cardKey) {
                    editor.update(() => {
                        $deselectCard(editor, selectedCardKey);

                        setSelectedCardKey(cardKey);
                        setIsEditingCard(false);
                    }, {tag: 'history-merge'}); // don't include a history entry for selection change
                }

                if (!isCardSelected && selectedCardKey) {
                    editor.update(() => {
                        $deselectCard(editor, selectedCardKey);

                        setSelectedCardKey(null);
                        setIsEditingCard(false);
                    }, {tag: 'history-merge'}); // don't include a history entry for selection change
                }

                // we have special-case cards that are inserted via markdown
                // expansions where we can't use editor commands to open in
                // edit mode so we handle that here instead
                if (isCardSelected && cardNode.__openInEditMode) {
                    editor.update(() => {
                        cardNode.clearOpenInEditMode();
                    }, {tag: 'history-merge'}); // don't include a history entry for clearing the open in edit mode prop

                    setIsEditingCard(true);
                }
            }),
            editor.registerCommand(
                INSERT_CARD_COMMAND,
                ({cardNode, openInEditMode}) => {
                    let focusNode;

                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        focusNode = selection.focus.getNode();
                    } else if ($isNodeSelection(selection)) {
                        focusNode = selection.getNodes()[0];
                    } else {
                        return false;
                    }

                    if (focusNode !== null) {
                        $insertAndSelectNode({selectedNode: focusNode, newNode: cardNode});

                        setSelectedCardKey(cardNode.getKey());

                        if (openInEditMode) {
                            setIsEditingCard(true);
                        }
                    }

                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                SELECT_CARD_COMMAND,
                ({cardKey}) => {
                    // already selected, delete if empty as we're exiting edit mode
                    if (selectedCardKey === cardKey && isEditingCard) {
                        const cardNode = $getNodeByKey(cardKey);
                        if (cardNode.isEmpty?.()) {
                            editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey});
                            return true;
                        }
                    }

                    if (selectedCardKey && selectedCardKey !== cardKey) {
                        $deselectCard(editor, selectedCardKey);
                    }

                    $selectCard(editor, cardKey);

                    setSelectedCardKey(cardKey);
                    setIsEditingCard(false);
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                EDIT_CARD_COMMAND,
                ({cardKey, focusEditor}) => {
                    if (selectedCardKey && selectedCardKey !== cardKey) {
                        $deselectCard(editor, selectedCardKey);
                    }
                    $selectCard(editor, cardKey);

                    setSelectedCardKey(cardKey);

                    const cardNode = $getNodeByKey(cardKey);
                    if (cardNode.hasEditMode?.()) {
                        setIsEditingCard(true);
                    }
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                DESELECT_CARD_COMMAND,
                ({cardKey}) => {
                    $deselectCard(editor, cardKey);

                    setSelectedCardKey(null);
                    setIsEditingCard(false);
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                DELETE_CARD_COMMAND,
                ({cardKey, direction = 'forward'}) => {
                    const cardNode = $getNodeByKey(cardKey);
                    const previousSibling = cardNode.getPreviousSibling();
                    const nextSibling = cardNode.getNextSibling();

                    if (direction === 'backward' && previousSibling) {
                        if ($isDecoratorNode(previousSibling)) {
                            const nodeSelection = $createNodeSelection();
                            nodeSelection.add(previousSibling.getKey());
                            $setSelection(nodeSelection);
                        } else if (previousSibling.selectEnd) { // decorator nodes have selectEnd, so this needs to come after that check
                            previousSibling.selectEnd();
                        } else {
                            cardNode.selectPrevious();
                        }
                    } else if (nextSibling) {
                        if ($isDecoratorNode(nextSibling)) {
                            const nodeSelection = $createNodeSelection();
                            nodeSelection.add(nextSibling.getKey());
                            $setSelection(nodeSelection);
                        } else if (nextSibling.selectStart) { // decorator nodes have selectStart, so this needs to come after that check
                            nextSibling.selectStart();
                        } else {
                            cardNode.selectNext();
                        }
                    } else {
                        // ensure we still have a paragraph if the deleted card was the only node
                        const paragraph = $createParagraphNode();
                        $getRoot().append(paragraph);
                        paragraph.select();
                    }

                    cardNode.remove();

                    // ensure focus moves back to the editor if we lost it by selecting a card
                    editor.getRootElement().focus();

                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_DOWN_COMMAND,
                (event) => {
                    // Avoid processing custom commands when inside a card's editor.
                    // This also prevents Lexical calling event.preventDefault on
                    // cut/copy/paste events letting the browser/inner editors do their thing
                    if (shouldIgnoreEvent(event)) {
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (event) => {
                    // toggle edit mode if a card is selected and ctrl/cmd+enter is pressed
                    if (selectedCardKey && (event.metaKey || event.ctrlKey)) {
                        const cardNode = $getNodeByKey(selectedCardKey);

                        if (cardNode.hasEditMode?.()) {
                            event.preventDefault();

                            // when leaving edit mode, ensure focus moves back to the editor
                            // otherwise focus can be left on removed elements preventing further key events
                            if (isEditingCard) {
                                editor.getRootElement().focus({preventScroll: true});

                                if (cardNode.isEmpty?.()) {
                                    if ($getRoot().getLastChild().is(cardNode)) {
                                        // we don't have anything to select after the card, so create a new paragraph
                                        const paragraph = $createParagraphNode();
                                        $getRoot().append(paragraph);
                                        paragraph.select();
                                    } else {
                                        // reselect card to ensure we have a selection for the next steps
                                        $selectCard(editor, selectedCardKey);

                                        // select the next paragraph or card
                                        editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND);
                                    }

                                    cardNode.remove();
                                } else {
                                    // re-create the node selection because the focus will place the cursor at
                                    // the beginning of the doc
                                    $selectCard(editor, selectedCardKey);
                                }

                                setIsEditingCard(false);
                            } else {
                                setIsEditingCard(true);
                            }

                            return true;
                        }
                    }

                    // let the browser handle selection when in a card inner element (e.g. nested editor)
                    // NOTE: must come after ctrl/cmd+enter because that always toggles no matter the selection
                    if (!event._fromNested && document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    // if a card is selected, insert a new paragraph after it
                    if (!isNested && selectedCardKey) {
                        event.preventDefault();
                        const cardNode = $getNodeByKey(selectedCardKey);
                        const paragraphNode = $createParagraphNode();
                        // cardNode.getTopLevelElementOrThrow().insertAfter(paragraphNode);
                        cardNode.insertAfter(paragraphNode);
                        paragraphNode.select();
                        return true;
                    }

                    // code card shortcut
                    if (!isNested) {
                        const selection = $getSelection();
                        const currentNode = selection?.getNodes()[0];
                        if ($isTextNode(currentNode)) {
                            const textContent = currentNode.getTextContent();
                            if (textContent.match(/^```(\w{1,10})?/)) {
                                event.preventDefault();
                                const language = textContent.replace(/^```/,'');
                                const replacementNode = currentNode.getTopLevelElement().insertAfter($createCodeBlockNode({language, _openInEditMode: true}));
                                currentNode.getTopLevelElement().remove();

                                // select node when replacing so it immediately renders in editing mode
                                const replacementSelection = $createNodeSelection();
                                replacementSelection.add(replacementNode.getKey());
                                $setSelection(replacementSelection);
                                return true;
                            }
                        }
                    }
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ARROW_UP_COMMAND,
                (event) => {
                    const selection = $getSelection();

                    // if a selection is being made, we need to handle it ourselves (lexical does not handle decorator nodes at this time)
                    if (event?.shiftKey) {
                        if ($isRangeSelection(selection)) {
                            let anchorNode = selection.anchor.getNode();

                            if (!$isRootNode(anchorNode)) {
                                anchorNode = anchorNode.getTopLevelElement();
                                let focusNode = selection.focus.getNode().getTopLevelElement();

                                // treat text nodes as normal
                                let previousSibling = focusNode.getTopLevelElement().getPreviousSibling();
                                if ($isTextNode(focusNode) && $isTextNode(previousSibling)) {
                                    return false;
                                }
                                // if on or about to move to decorator node selection, select the entire current node using root node offsets
                                if ($isDecoratorNode(anchorNode) || $isDecoratorNode(previousSibling)) {
                                    // if at the start of the line, treat that line/node as not selected
                                    if (selection.anchor.offset === 0) {
                                        selection.focus.set('root', focusNode.getIndexWithinParent() - 1, 'element');
                                        selection.anchor.set('root', anchorNode.getIndexWithinParent(), 'element');
                                    } else {
                                        selection.focus.set('root', focusNode.getIndexWithinParent(), 'element');
                                        selection.anchor.set('root', anchorNode.getIndexWithinParent() + 1, 'element');
                                    }
                                    event.preventDefault();
                                    return true;
                                }
                            }

                            // if using the root node, simply add the card above
                            if ($isRootNode(anchorNode)) {
                                const offset = selection.focus.offset;
                                if (offset > 0) {
                                    selection.focus.set('root', selection.focus.offset - 1, 'element');
                                }
                                event.preventDefault();
                                return true;
                            }
                        }
                        // use default behavior for other selection
                        return false;
                    }

                    // if we're in a nested editor, we need to move selection back to the parent editor
                    if (event?._fromCaptionEditor) {
                        $selectCard(editor, selectedCardKey);
                    }

                    // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    if ($isNodeSelection(selection)) {
                        const currentNode = selection.getNodes()[0];
                        const previousSibling = currentNode.getPreviousSibling();

                        if (!previousSibling && cursorDidExitAtTop) {
                            selection.clear();
                            cursorDidExitAtTop();
                            return true;
                        }

                        if ($isDecoratorNode(previousSibling)) {
                            $selectDecoratorNode(previousSibling);
                            return true;
                        }

                        // move cursor to end of previous node
                        event.preventDefault();
                        previousSibling.selectEnd();
                        return true;
                    }

                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed()) {
                            const topLevelElement = selection.anchor.getNode().getTopLevelElement();
                            const nativeSelection = window.getSelection();

                            if (cursorDidExitAtTop && $isAtStartOfDocument(selection)) {
                                cursorDidExitAtTop();
                                return true;
                            }

                            // empty paragraphs are odd because the native range won't
                            // have a rect to compare positioning
                            const onEmptyNode =
                                topLevelElement?.getTextContent().trim() === '' &&
                                selection.anchor.offset === 0;

                            const atStartOfElement =
                                selection.anchor.offset === 0 &&
                                selection.focus.offset === 0;

                            if (onEmptyNode || atStartOfElement) {
                                const previousSibling = topLevelElement.getPreviousSibling();
                                if ($isDecoratorNode(previousSibling)) {
                                    $selectDecoratorNode(previousSibling);
                                    return true;
                                }
                            } else {
                                const atTopOfNode = $isAtTopOfNode(nativeSelection, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX);
                                if (atTopOfNode) {
                                    const previousSibling = topLevelElement.getPreviousSibling();
                                    if ($isDecoratorNode(previousSibling)) {
                                        $selectDecoratorNode(previousSibling);
                                        return true;
                                    }
                                }
                            }
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ARROW_DOWN_COMMAND,
                (event) => {
                    const selection = $getSelection();

                    // if a selection is being made, we need to handle it ourselves (lexical does not handle decorator nodes at this time)
                    if (event?.shiftKey) {
                        if ($isRangeSelection(selection)) {
                            let anchorNode = selection.anchor.getNode();

                            if (!$isRootNode(anchorNode)) {
                                anchorNode = anchorNode.getTopLevelElement();
                                let focusNode = selection.focus.getNode().getTopLevelElement();

                                // treat text nodes as normal
                                let nextSibling = focusNode.getTopLevelElement().getNextSibling();
                                if ($isTextNode(focusNode) && $isTextNode(nextSibling)) {
                                    return false;
                                }
                                // if on or about to move to decorator node selection, select the entire current node using root node offsets
                                if ($isDecoratorNode(anchorNode) || $isDecoratorNode(nextSibling)) {
                                    // if at end of a line, treat it as if that line/node is not selected
                                    if (selection.anchor.offset === anchorNode.getTextContentSize()) {
                                        selection.anchor.set('root', anchorNode.getIndexWithinParent() + 1, 'element');
                                        selection.focus.set('root', focusNode.getIndexWithinParent() + 2, 'element');
                                    } else {
                                        selection.anchor.set('root', anchorNode.getIndexWithinParent(), 'element');
                                        selection.focus.set('root', focusNode.getIndexWithinParent() + 1, 'element');
                                    }
                                    event.preventDefault();
                                    return true;
                                }
                            }

                            // if using the root node, simply add the card below
                            if ($isRootNode(anchorNode)) {
                                const offset = selection.focus.offset;
                                if (offset <= anchorNode.getLastChildOrThrow().getIndexWithinParent()) {
                                    selection.focus.set('root', selection.focus.offset + 1, 'element');
                                }
                                event.preventDefault();
                                return true;
                            }
                        }
                        // use default behavior for other selection
                        return false;
                    }

                    // if we're in a nested editor, we need to move selection back to the parent editor
                    if (event?._fromCaptionEditor) {
                        $selectCard(editor, selectedCardKey);
                    }

                    // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    if ($isNodeSelection(selection)) {
                        const currentNode = selection.getNodes()[0];
                        const nextSibling = currentNode.getNextSibling();

                        // create a new paragraph and select it if selected card is at end of document
                        if (!nextSibling) {
                            const paragraph = $createParagraphNode();
                            currentNode.insertAfter(paragraph);
                            paragraph.select();
                            return true;
                        }

                        // if next sibling is a card, select it (default Lexical behaviour skips over cards)
                        if ($isDecoratorNode(nextSibling)) {
                            $selectDecoratorNode(nextSibling);
                            return true;
                        }

                        // move cursor to end of previous node
                        event?.preventDefault();
                        nextSibling.selectStart();
                        return true;
                    }

                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed()) {
                            const topLevelElement = selection.anchor.getNode().getTopLevelElement();
                            const nativeSelection = window.getSelection();
                            const nativeTopLevelElement = getTopLevelNativeElement(nativeSelection.anchorNode);

                            // empty paragraphs are odd because the native range won't
                            // have a rect to compare positioning
                            const onEmptyNode =
                                topLevelElement?.getTextContent().trim() === '' &&
                                selection.anchor.offset === 0;

                            const atEndOfElement =
                                nativeSelection.rangeCount !== 0 &&
                                nativeSelection.anchorNode === nativeTopLevelElement &&
                                nativeSelection.anchorOffset === nativeTopLevelElement.children.length - 1 &&
                                nativeSelection.focusOffset === nativeTopLevelElement.children.length - 1;

                            if (onEmptyNode || atEndOfElement) {
                                const nextSibling = topLevelElement.getNextSibling();
                                if ($isDecoratorNode(nextSibling)) {
                                    $selectDecoratorNode(nextSibling);
                                    return true;
                                }
                            } else {
                                const range = nativeSelection.getRangeAt(0).cloneRange();
                                const rects = range.getClientRects();

                                if (rects.length > 0) {
                                    // rects.length will be 2 if at the start/end of a line and we should default to the new/second line for
                                    //  determining if a card is below the cursor
                                    const rangeRect = rects.length > 1 ? rects[1] : rects[0];
                                    const elemRect = nativeTopLevelElement.getBoundingClientRect();

                                    if (Math.abs(rangeRect.bottom - elemRect.bottom) < RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX) {
                                        const nextSibling = topLevelElement.getNextSibling();
                                        if ($isDecoratorNode(nextSibling)) {
                                            $selectDecoratorNode(nextSibling);
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ARROW_LEFT_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    const selection = $getSelection();

                    if (cursorDidExitAtTop) {
                        if ($isNodeSelection(selection)) {
                            const currentNode = selection.getNodes()[0];
                            const previousSibling = currentNode.getPreviousSibling();

                            if (!previousSibling) {
                                event.preventDefault();
                                selection.clear();
                                cursorDidExitAtTop?.();
                                return true;
                            }
                        } else if ($isAtStartOfDocument(selection)) {
                            event.preventDefault();
                            cursorDidExitAtTop();
                            return true;
                        }
                    }

                    if (!$isNodeSelection(selection)) {
                        return false;
                    }

                    const firstNode = selection.getNodes()[0];
                    let previousSibling;

                    if (!$isKoenigCard(firstNode)) {
                        const topLevelElement = firstNode.getTopLevelElement();
                        previousSibling = topLevelElement.getPreviousSibling();
                    } else {
                        previousSibling = firstNode.getPreviousSibling();
                    }

                    if ($isDecoratorNode(previousSibling)) {
                        event.preventDefault();
                        $selectDecoratorNode(previousSibling);
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ARROW_RIGHT_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    const selection = $getSelection();

                    if (!$isNodeSelection(selection)) {
                        return false;
                    }

                    const selectedNodes = selection.getNodes();
                    const lastNode = selectedNodes[selectedNodes.length - 1];

                    let nextSibling;
                    if ($isKoenigCard(lastNode)) {
                        nextSibling = lastNode.getNextSibling();
                    } else {
                        const topLevelElement = lastNode.getTopLevelElement();
                        nextSibling = topLevelElement.getNextSibling();
                    }

                    if ($isDecoratorNode(nextSibling)) {
                        event.preventDefault();
                        $selectDecoratorNode(nextSibling);
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_MODIFIER_COMMAND,
                (event) => {
                    const {altKey, ctrlKey, metaKey, shiftKey, code, key} = event;
                    const isArrowUp = key === 'ArrowUp' || event.keyCode === 38;
                    const isArrowDown = key === 'ArrowDown' || event.keyCode === 40;

                    if (metaKey && (isArrowUp || isArrowDown)) {
                        const selection = $getSelection();
                        const isNodeSelected = $isNodeSelection(selection);
                        const hasCardAtStart = $isDecoratorNode($getRoot().getFirstChild());
                        const hasCardAtEnd = $isDecoratorNode($getRoot().getLastChild());

                        if (isNodeSelected || hasCardAtStart || hasCardAtEnd) {
                            // meta+down on macos moves cursor to end of document
                            if (isArrowDown) {
                                event.preventDefault();

                                const lastNode = $getRoot().getLastChild();

                                if ($isDecoratorNode(lastNode)) {
                                    $selectDecoratorNode(lastNode);
                                    return true;
                                } else {
                                    lastNode.selectEnd();
                                    return true;
                                }
                            }

                            // meta+up on macos moves cursor to start of document
                            if (isArrowUp) {
                                event.preventDefault();

                                const firstNode = $getRoot().getFirstChild();

                                if ($isDecoratorNode(firstNode)) {
                                    $selectDecoratorNode(firstNode);
                                    return true;
                                } else {
                                    firstNode.selectStart();
                                    return true;
                                }
                            }
                        }
                    }

                    if (ctrlKey && code === 'KeyQ') {
                        // avoid quit behaviour
                        event.preventDefault();

                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const firstNode = selection.anchor.getNode().getTopLevelElement();

                            if ($isParagraphNode(firstNode)) {
                                $setBlocksType(selection, () => $createQuoteNode());
                            } else if ($isQuoteNode(firstNode)) {
                                $setBlocksType(selection, () => $createAsideNode());
                            } else if ($isAsideNode(firstNode)) {
                                $setBlocksType(selection, () => $createParagraphNode());
                            }
                        }
                    }

                    // Ctrl+Option+H to toggle highlight
                    if ((ctrlKey || metaKey) && altKey && code === 'KeyH') {
                        event.preventDefault();
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');
                        return true;
                    }

                    // ctrl shift K should format text as code
                    if (ctrlKey && shiftKey && code === 'KeyK') {
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
                        return true;
                    }

                    // ctrl alt U should strikethrough (cmd alt U launches the browser source view)
                    if (ctrlKey && altKey && code === 'KeyU') {
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
                        return true;
                    }

                    // ctrl alt 1-6 should create headings
                    if (ctrlKey && altKey && key.match(/^[1-6]$/)) {
                        event.preventDefault();

                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode(`h${key}`));
                        }
                    }

                    if (ctrlKey && code === 'KeyL') {
                        event.preventDefault();

                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const firstNode = selection.anchor.getNode().getTopLevelElement();

                            if ($isListNode(firstNode)) {
                                editor.update(() => {
                                    const pNode = $createParagraphNode();
                                    $setBlocksType(selection, () => pNode);

                                    // Lexical will automatically indent the paragraph node to the
                                    // list item level but we don't allow indented paragraphs
                                    pNode.setIndent(0);
                                });
                            } else {
                                if (altKey) {
                                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                                } else {
                                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                                }
                            }
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            // backspace when card isn't selected
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    // delete selected card if we have one
                    if (!isNested && selectedCardKey) {
                        event.preventDefault();
                        editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey: selectedCardKey, direction: 'backward'});
                        return true;
                    }

                    const selection = $getSelection();

                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed()) {
                            const anchor = selection.anchor;
                            const anchorNode = anchor.getNode();
                            const topLevelElement = anchorNode.getTopLevelElement();
                            const previousSibling = topLevelElement.getPreviousSibling();

                            const atStartOfElement =
                                selection.anchor.offset === 0 &&
                                selection.focus.offset === 0;

                            // convert empty top level list items to paragraphs
                            if (
                                atStartOfElement &&
                                $isListItemNode(anchorNode) &&
                                anchorNode.getIndent() === 0 &&
                                anchorNode.isEmpty()
                            ) {
                                event.preventDefault();
                                editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND);
                                return true;
                            }

                            // see https://github.com/facebook/lexical/issues/5226
                            // upstream bug with firefox only
                            if (
                                atStartOfElement &&
                                $isLinkNode(anchorNode.getPreviousSibling())
                            ) {
                                const linkNode = anchorNode.getPreviousSibling();
                                const lastDescendent = linkNode.getLastDescendant();
                                if ($isTextNode(lastDescendent)) {
                                    lastDescendent.spliceText(lastDescendent.getTextContentSize(), 1, '', true);
                                    return true;
                                }
                            }

                            // delete empty paragraphs and select card if preceded by card
                            if ($isParagraphNode(anchorNode) && anchorNode.isEmpty() && $isDecoratorNode(previousSibling)) {
                                topLevelElement.remove();
                                $selectDecoratorNode(previousSibling);
                                return true;
                            }

                            // convert populated top level list items to paragraphs when cursor is at beginning
                            if (atStartOfElement && $isListItemNode(anchorNode.getParent())) {
                                const listItemNode = anchorNode.getParent();
                                if (listItemNode.getIndent() === 0) {
                                    event.preventDefault();
                                    const paragraphNode = $createParagraphNode();
                                    paragraphNode.append(...listItemNode.getChildren());
                                    listItemNode.replace(paragraphNode);
                                    return true;
                                }
                            }

                            const anchorNodeParent = anchorNode.getParent();

                            // convert to paragraph if backspace is at start of the quote/aside block
                            if (
                                atStartOfElement &&
                                ($isQuoteNode(anchorNodeParent) || $isAsideNode(anchorNodeParent))
                            ) {
                                const paragraph = $createParagraphNode();
                                anchorNodeParent.getChildren().forEach((child) => {
                                    paragraph.append(child);
                                });
                                anchorNodeParent.replace(paragraph);
                                paragraph.selectStart();
                                event.preventDefault();
                                return true;
                            }

                            // delete any previous card keeping caret in place
                            if (
                                atStartOfElement &&
                                $isDecoratorNode(previousSibling) &&
                                anchorNodeParent === topLevelElement && // handles lists, where the parent node is not the paragraph
                                anchorNodeParent.getFirstChild().is(anchorNode) // handles child nodes in paragraphs, e.g. LinkNode and HorizontalRule
                            ) {
                                event.preventDefault();
                                previousSibling.remove();
                                return true;
                            }

                            const anchorNodeLength = anchorNode.getTextContentSize();
                            const atEndOfElement =
                                selection.anchor.offset === anchorNodeLength &&
                                selection.focus.offset === anchorNodeLength;

                            // undo any markdown special formats when deleting at the end of a formatted text node
                            if (atEndOfElement && $isTextNode(anchorNode)) {
                                const textContent = anchorNode.getTextContent();

                                for (const tag of Object.keys(SPECIAL_MARKUPS)) {
                                    if (anchorNode.hasFormat(tag)) {
                                        const markup = SPECIAL_MARKUPS[tag];
                                        // for replacement strings e.g. {{variable}} we shouldn't add the markup (assumes use of ReplacementStringsPlugin)
                                        let newText = textContent;
                                        if (tag === 'code' && textContent.match(/{.*?}(?![A-Za-z\s])/)) {
                                            newText = newText.slice(0,-1);
                                        } else {
                                            newText = markup + newText + markup;
                                            newText = newText.slice(0,-1); // remove last markup character
                                        }

                                        // manually clear formatting and push offset to accommodate for the added markup
                                        anchorNode.setFormat(0);
                                        anchorNode.setTextContent(newText);
                                        selection.anchor.offset = selection.anchor.offset + newText.length - textContent.length;
                                        selection.focus.offset = selection.focus.offset + newText.length - textContent.length;

                                        event.preventDefault();
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    // delete selected card if we have one
                    if (!isNested && selectedCardKey) {
                        event.preventDefault();
                        editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey: selectedCardKey, direction: 'forward'});
                        return true;
                    }

                    // handle card selection around card boundaries
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed()) {
                            const anchor = selection.anchor;
                            const anchorNode = anchor.getNode();
                            const topLevelElement = anchorNode.getTopLevelElement();
                            const nextSibling = topLevelElement.getNextSibling();

                            const onEmptyNode =
                                topLevelElement?.getTextContent().trim() === '' &&
                                selection.anchor.offset === 0;

                            if (onEmptyNode && $isDecoratorNode(nextSibling)) {
                                // delete the empty node and select the previous card
                                event.preventDefault();
                                topLevelElement.remove();
                                $selectDecoratorNode(nextSibling);
                                return true;
                            }

                            const atEndOfNode = ((
                                anchor.type === 'element' &&
                                $isElementNode(anchorNode) &&
                                anchor.offset === anchorNode.getChildrenSize()
                            ) || (
                                anchor.type === 'text' &&
                                anchor.offset === anchorNode.getTextContentSize() &&
                                anchor.getNode().getParent().getLastChild().is(anchor.getNode())
                            ));

                            if (atEndOfNode && $isDecoratorNode(nextSibling)) {
                                // delete the card, keeping selection in place
                                event.preventDefault();
                                nextSibling.remove();
                                return true;
                            }
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                DELETE_LINE_COMMAND,
                (isBackward) => {
                    // delete selected card if it's not a nested editor
                    if (selectedCardKey && document.activeElement === editor.getRootElement() && !isNested) {
                        editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey: selectedCardKey, direction: isBackward ? 'backward' : 'forward'});
                        return true;
                    }

                    // Avoid deleting a card accidentally:
                    // If a paragraph contains only one line and is next to a card, then by default CMD + Backspace deletes the line + the sibling card
                    // In that case, we avoid using the default `selection.deleteLine()` from Lexical
                    // Instead, we remove the topLevelElement and put the selection on the sibling card
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed()) {
                            const anchor = selection.anchor;
                            const anchorNode = anchor.getNode();
                            const topLevelElement = anchorNode.getTopLevelElement();
                            const previousSibling = topLevelElement.getPreviousSibling();
                            const nextSibling = topLevelElement.getNextSibling();
                            const sibling = isBackward ? previousSibling : nextSibling;

                            // Find out if the paragraph contains only one line
                            const nativeSelection = window.getSelection();
                            const isFirstLine = $isAtTopOfNode(nativeSelection, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX);

                            if ($isDecoratorNode(sibling) && isFirstLine) {
                                if (isBackward && $isLineBreakNode(anchorNode.getNextSibling())) {
                                    anchorNode.remove();
                                    return true;
                                }
                                topLevelElement.remove();
                                $selectDecoratorNode(sibling);

                                return true;
                            }
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_TAB_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    // exit the editor if we're shift tabbing on an element that isn't tabbed
                    if (event.shiftKey && cursorDidExitAtTop) {
                        const selection = $getSelection();

                        if ($isNodeSelection(selection)) {
                            event.preventDefault();
                            selection.clear();
                            cursorDidExitAtTop();
                            return true;
                        }

                        let nodes;
                        if (selection.isCollapsed()) {
                            const anchorNode = selection.anchor.getNode();
                            nodes = $isTextNode(anchorNode) ? [anchorNode.getParent()] : [anchorNode];
                        } else {
                            nodes = selection.getNodes();
                        }

                        const hasIndentedNode = nodes.some((node) => {
                            return node.getIndent && node.getIndent() > 0;
                        });

                        if (!hasIndentedNode) {
                            event.preventDefault();
                            cursorDidExitAtTop();
                            return true;
                        }
                    }

                    // code card shortcut
                    if (!isNested) {
                        const selection = $getSelection();
                        const currentNode = selection.getNodes()[0];
                        if ($isTextNode(currentNode)) {
                            const textContent = currentNode.getTextContent();
                            if (textContent.match(/^```(\w{1,10})?/)) {
                                event.preventDefault();
                                const language = textContent.replace(/^```/,'');
                                const replacementNode = currentNode.getTopLevelElement().insertAfter($createCodeBlockNode({language, _openInEditMode: true}));
                                currentNode.getTopLevelElement().remove();

                                // select node when replacing so it immediately renders in editing mode
                                const replacementSelection = $createNodeSelection();
                                replacementSelection.add(replacementNode.getKey());
                                $setSelection(replacementSelection);
                                return true;
                            }
                        }

                        // handle indent behavior
                        if ($isListItemNode(currentNode) || ($isTextNode(currentNode) && $isListItemNode(currentNode.getParent()))) {
                            event.preventDefault();
                            let node = $isTextNode(currentNode) ? currentNode.getParent() : currentNode;
                            const indent = node.getIndent();
                            if (event.shiftKey) {
                                if (indent > 0) {
                                    node.setIndent(indent - 1);
                                }
                            } else {
                                node.setIndent(indent + 1);
                            }
                            return true;
                        }

                        // generally prevent tabs from leaving the editor/interacting with the browser
                        event.preventDefault();
                        return true;
                    }
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                (event) => {
                    if (selectedCardKey && isEditingCard) {
                        (editor._parentEditor || editor).dispatchCommand(SELECT_CARD_COMMAND, {cardKey: selectedCardKey});
                    }

                    if (editor._parentEditor) {
                        editor._parentEditor.getRootElement().focus();
                    }

                    event.preventDefault();
                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                PASTE_COMMAND,
                (clipboardEvent) => {
                    // avoid Koenig behaviours when an inner element (e.g. a card input) has focus
                    // and event wasn't triggered from nested editor
                    if (document.activeElement !== editor.getRootElement() && !isNested) {
                        // ignore default Lexical behaviour when inside an inner input or contenteditable,
                        // without this paste events inside CodeMirror for example will replace the card
                        if (shouldIgnoreEvent(clipboardEvent)) {
                            return true;
                        } else {
                            return false;
                        }
                    }

                    const clipboardData = clipboardEvent.clipboardData;
                    if (!clipboardData) {
                        return false;
                    }

                    const text = clipboardData.getData(MIME_TEXT_PLAIN);

                    // TODO: replace with better regex to include more protocols like mailto, ftp, etc
                    const linkMatch = text?.match(/^(https?:\/\/[^\s]+)$/);
                    if (linkMatch) {
                        // avoid any conversion if we're pasting onto a card shortcut
                        const node = $getSelection()?.anchor.getNode();
                        if (node && node.getTextContent().startsWith('/')) {
                            return false;
                        }

                        // we're pasting a URL, convert it to an embed/bookmark/link
                        clipboardEvent.preventDefault();
                        editor.dispatchCommand(PASTE_LINK_COMMAND, {linkMatch});

                        return true;
                    }

                    const html = clipboardData.getData(MIME_TEXT_HTML);
                    if (text && !html) {
                        clipboardEvent?.preventDefault();
                        editor.dispatchCommand(PASTE_MARKDOWN_COMMAND, {text, allowBr: true});

                        return true;
                    }

                    // Override Lexical's default paste behaviour when copy/pasting images:
                    //   - By default, Lexical ignores files if there is text/html or text/plain content in the clipboard
                    //   - This causes images copied from e.g. Slack to not paste correctly
                    //   - With this override, we allow pasting images when there is a single image file in the clipboard and if the text/html contains a <img /> tag
                    //
                    // Lexical code:
                    // https://github.com/facebook/lexical/blob/main/packages/lexical-rich-text/src/index.ts#L492-L494
                    // https://github.com/facebook/lexical/blob/main/packages/lexical-rich-text/src/index.ts#L1035
                    const files = clipboardData.files ? Array.from(clipboardData.files) : [];
                    const imageFiles = files.filter(file => file.type.startsWith('image/'));
                    const imgTagMatch = html && !!html.match(/<\s*img\b/gi);

                    if (imageFiles.length === 1 && imgTagMatch) {
                        clipboardEvent.preventDefault();
                        editor.dispatchCommand(DRAG_DROP_PASTE, files);

                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                PASTE_LINK_COMMAND,
                ({linkMatch}) => {
                    const selection = $getSelection();
                    const selectionContent = selection.getTextContent();
                    const node = selection.anchor.getNode();
                    const nodeContent = node.getTextContent();

                    if (selectionContent.length > 0) {
                        const url = linkMatch[1];
                        if ($isRangeSelection(selection)) {
                            editor.dispatchCommand(TOGGLE_LINK_COMMAND, {url, rel: null});
                        }
                        return true;
                    }

                    // if a link is pasted in a populated text node or pasted with Shift pressed, insert a link
                    if (nodeContent.length > 0 || isShiftPressed.current === true) {
                        const link = linkMatch[1];
                        const linkNode = $createLinkNode(link);
                        const linkTextNode = $createTextNode(link);
                        linkNode.append(linkTextNode);

                        // add a space after to avoid the rest of the text being linked when inserting
                        // then immediately remove as we don't want the extra space
                        // TODO: raise Lexical bug?
                        const spaceTextNode = $createTextNode(' ');
                        $insertNodes([linkNode, spaceTextNode]);
                        spaceTextNode.remove();

                        return true;
                    }

                    // if a link is pasted in a blank text node, insert an embed card (may turn into bookmark)
                    if (selectionContent.length === 0 && nodeContent.length === 0) {
                        const url = linkMatch[1];
                        const embedNode = $createEmbedNode({url});
                        editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode: embedNode, createdWithUrl: true});
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                CLICK_COMMAND,
                (event) => {
                    if (event.target.matches('[data-lexical-decorator="true"]')) {
                        // clicked on a decorator node, select it
                        // - only occurs when the padding above a card is clicked as our
                        //   cards have their own click handlers
                        event.preventDefault();
                        const cardNode = $getNearestNodeFromDOMNode(event.target);
                        $selectCard(editor, cardNode.getKey());
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                CUT_COMMAND,
                (event) => {
                    // prevent cut events inside card editors triggering lexical behaviour
                    if (shouldIgnoreEvent(event)) {
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    // remove alignment formats,
    // denest invalid node nesting,
    // merge list nodes of same type
    React.useEffect(() => {
        return registerDefaultTransforms(editor);
    }, [editor]);

    return null;
}

export default function KoenigBehaviourPlugin({containerElem = document.querySelector('.koenig-editor'), cursorDidExitAtTop, isNested}) {
    const [editor] = useLexicalComposerContext();
    return useKoenigBehaviour({editor, containerElem, cursorDidExitAtTop, isNested});
}
