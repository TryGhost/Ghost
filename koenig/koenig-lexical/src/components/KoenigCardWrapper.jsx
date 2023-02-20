import React from 'react';
import {
    $createNodeSelection,
    $createParagraphNode,
    $getNodeByKey,
    $getRoot,
    $getSelection,
    $isDecoratorNode,
    $isNodeSelection,
    $setSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_EDITOR,
    COMMAND_PRIORITY_LOW,
    KEY_ARROW_DOWN_COMMAND,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    KEY_ENTER_COMMAND,
    KEY_ESCAPE_COMMAND
} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import CardContext from '../context/CardContext';
import {CardWrapper} from './ui/CardWrapper';
import {$selectDecoratorNode} from '../utils/$selectDecoratorNode';

const KoenigCardWrapperComponent = ({nodeKey, width, wrapperStyle, IndicatorIcon, openInEditMode = false, children}) => {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
    const [isEditing, setEditing] = React.useState(openInEditMode);
    const [selection, setSelection] = React.useState(null);
    const [cardType, setCardType] = React.useState(null);
    const [cardWidth, setCardWidth] = React.useState(width || 'regular');
    const containerRef = React.useRef(null);

    const $removeOrReplaceNodeWithParagraph = React.useCallback((node) => {
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
    }, [editor]);

    React.useLayoutEffect(() => {
        editor.getEditorState().read(() => {
            const cardNode = $getNodeByKey(nodeKey);
            setCardType(cardNode.getType());
        });

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        function select() {
            setSelected(true);
        }

        return mergeRegister(
            editor.registerUpdateListener(({editorState}) => {
                const latestSelection = editorState.read(() => $getSelection());
                setSelection(latestSelection);

                const cardIsSelected = editorState.read(() => {
                    return $isNodeSelection(latestSelection) &&
                        latestSelection.getNodes().length === 1 &&
                        latestSelection.getNodes()[0].getKey() === nodeKey;
                });

                // ensure edit mode is removed any time the card loses selection
                if (isEditing && !cardIsSelected) {
                    setEditing(false);

                    editor.update(() => {
                        const cardNode = $getNodeByKey(nodeKey);

                        if (cardNode.isEmpty?.()) {
                            $removeOrReplaceNodeWithParagraph(cardNode);
                        }
                    });
                }
            }),
            editor.registerCommand(
                CLICK_COMMAND,
                (event) => {
                    if (containerRef.current.contains(event.target)) {
                        const cardNode = $getNodeByKey(nodeKey);
                        if (cardNode.hasEditMode?.() && isSelected) {
                            setEditing(true);
                            clearSelected();
                            select();
                        } else {
                            clearSelected();
                            select();
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (event) => {
                    const latestSelection = $getSelection();

                    if (event.metaKey || event.ctrlKey) {
                        if (isSelected) {
                            event.preventDefault();

                            const cardNode = $getNodeByKey(nodeKey);

                            if (cardNode.hasEditMode?.()) {
                                setEditing(!isEditing);

                                // when leaving edit mode, ensure focus moves back to the editor
                                // otherwise focus can be left on removed elements preventing further key events
                                if (isEditing) {
                                    editor.getRootElement().focus({preventScroll: true});

                                    if (cardNode.isEmpty?.()) {
                                        if ($getRoot().getLastChild().is(cardNode)) {
                                            const paragraph = $createParagraphNode();
                                            $getRoot().append(paragraph);
                                            paragraph.select();
                                        } else {
                                            // select the next paragraph or card
                                            editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND);
                                        }

                                        cardNode.remove();
                                    } else {
                                        // re-create the node selection because the focus will place the cursor at
                                        // the beginning of the doc
                                        const nodeSelection = $createNodeSelection();
                                        nodeSelection.add(nodeKey);
                                        $setSelection(nodeSelection);
                                    }
                                }
                            }

                            return true;
                        }
                    } else {
                        // avoid processing card behaviours when an inner element has focus
                        if (document.activeElement !== editor.getRootElement()) {
                            return true;
                        }
                        if (isSelected && $isNodeSelection(latestSelection) && latestSelection.getNodes().length === 1) {
                            event.preventDefault();
                            const cardNode = $getNodeByKey(nodeKey);
                            const paragraphNode = $createParagraphNode();
                            cardNode.getTopLevelElementOrThrow().insertAfter(paragraphNode);
                            paragraphNode.select();
                            return true;
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_EDITOR
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    const latestSelection = $getSelection();
                    if (isSelected && $isNodeSelection(latestSelection) && latestSelection.getNodes().length === 1) {
                        event.preventDefault();

                        const cardNode = $getNodeByKey(nodeKey);
                        const previousSibling = cardNode.getPreviousSibling();
                        const nextSibling = cardNode.getNextSibling();

                        if (previousSibling) {
                            if (previousSibling.selectEnd) {
                                previousSibling.selectEnd();
                            } else if ($isDecoratorNode(previousSibling)) {
                                const nodeSelection = $createNodeSelection();
                                nodeSelection.add(previousSibling.getKey());
                                $setSelection(nodeSelection);
                            } else {
                                cardNode.selectPrevious();
                            }
                        } else if (nextSibling) {
                            if (nextSibling.selectStart) {
                                nextSibling.selectStart();
                            } else if ($isDecoratorNode(nextSibling)) {
                                const nodeSelection = $createNodeSelection();
                                nodeSelection.add(nextSibling.getKey());
                                $setSelection(nodeSelection);
                            } else {
                                cardNode.selectNext();
                            }
                        }

                        cardNode.remove();

                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_EDITOR
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                (event) => {
                    // avoid processing card behaviours when an inner element has focus
                    if (document.activeElement !== editor.getRootElement()) {
                        return true;
                    }

                    const latestSelection = $getSelection();
                    if (isSelected && $isNodeSelection(latestSelection) && latestSelection.getNodes().length === 1) {
                        event.preventDefault();
                        const cardNode = $getNodeByKey(nodeKey);
                        const nextSibling = cardNode.getNextSibling();

                        if (nextSibling) {
                            if (nextSibling.selectStart) {
                                nextSibling.selectStart();
                            } else if ($isDecoratorNode(nextSibling)) {
                                const nodeSelection = $createNodeSelection();
                                nodeSelection.add(nextSibling.getKey());
                                $setSelection(nodeSelection);
                            } else {
                                cardNode.selectNext();
                            }
                        } else {
                            const paragraphNode = $createParagraphNode();
                            cardNode.getTopLevelElementOrThrow().insertAfter(paragraphNode);
                            paragraphNode.select();
                        }

                        cardNode.remove();

                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_EDITOR
            ),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                (event) => {
                    event.preventDefault();

                    const cardNode = $getNodeByKey(nodeKey);

                    if (cardNode.hasEditMode?.() && isEditing) {
                        if (cardNode.isEmpty?.()) {
                            $removeOrReplaceNodeWithParagraph(cardNode);
                        } else {
                            setEditing(false);
                            editor.update(() => {
                                $selectDecoratorNode(cardNode);
                            });
                            editor.getRootElement().focus({preventScroll: true});
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_EDITOR
            )
        );
    }, [editor, isSelected, isEditing, setSelected, clearSelected, setEditing, nodeKey, $removeOrReplaceNodeWithParagraph]);

    React.useEffect(() => {
        if (openInEditMode) {
            editor.update(() => {
                $getNodeByKey(nodeKey).clearOpenInEditMode();
            });
        }
    }, [editor, nodeKey, openInEditMode]);

    // isSelected will be true when the selection is a range covering a card
    // but for our purposes we want to know if the card is the only thing selected
    // for showing selected state, toolbars etc
    const isFocused = $isNodeSelection(selection) && isSelected;

    return (
        <CardContext.Provider value={{
            isSelected: isFocused,
            isEditing,
            cardWidth,
            setCardWidth,
            setEditing,
            selection,
            cardContainerRef: containerRef
        }}>
            <CardWrapper
                isSelected={isFocused}
                isEditing={isEditing}
                cardType={cardType}
                ref={containerRef}
                cardWidth={cardWidth}
                wrapperStyle={wrapperStyle}
                IndicatorIcon={IndicatorIcon}
            >
                {children}
            </CardWrapper>
        </CardContext.Provider>
    );
};

export default KoenigCardWrapperComponent;
