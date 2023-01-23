import React from 'react';
import {
    $createNodeSelection,
    $createParagraphNode,
    $getNodeByKey,
    $getSelection,
    $isDecoratorNode,
    $isNodeSelection,
    $setSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_EDITOR,
    COMMAND_PRIORITY_LOW,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    KEY_ENTER_COMMAND
} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import CardContext from '../context/CardContext';
import {CardWrapper} from './ui/CardWrapper';

const KoenigCardWrapperComponent = ({nodeKey, width, wrapperStyle, openInEditMode = false, children}) => {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
    const [isEditing, setEditing] = React.useState(false);
    const [selection, setSelection] = React.useState(null);
    const [cardType, setCardType] = React.useState(null);
    const [cardWidth, setCardWidth] = React.useState(width || 'regular');
    const containerRef = React.useRef(null);

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

        function deselect() {
            setSelected(false);
            setEditing(false);
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
                }
            }),
            editor.registerCommand(
                CLICK_COMMAND,
                (event) => {
                    if (containerRef.current.contains(event.target)) {
                        const node = $getNodeByKey(nodeKey);
                        if (node.hasEditMode?.() && isSelected) {
                            setEditing(true);
                            clearSelected();
                            select();
                        } else {
                            clearSelected();
                            select();
                        }
                    } else if (isSelected) {
                        deselect();
                        setEditing(false);
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

                            const node = $getNodeByKey(nodeKey);

                            if (node.hasEditMode?.()) {
                                setEditing(!isEditing);

                                // when leaving edit mode, ensure focus moves back to the editor
                                // otherwise focus can be left on removed elements preventing further key events
                                if (isEditing) {
                                    editor.getRootElement().focus();

                                    // re-create the node selection because the focus will place the cursor at
                                    // the beginning of the doc
                                    const nodeSelection = $createNodeSelection();
                                    nodeSelection.add(nodeKey);
                                    $setSelection(nodeSelection);
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
            )
        );
    }, [editor, isSelected, isEditing, setSelected, clearSelected, setEditing, nodeKey]);

    // when openInEditMode is true the card node may have been created but not selected.
    // make sure we reset the selection here
    React.useEffect(() => {
        if (openInEditMode) {
            editor.update(() => {
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(nodeKey);
                $setSelection(nodeSelection);

                const node = $getNodeByKey(nodeKey);
                node.clearOpenInEditMode();
            });

            setSelected(true);
            setEditing(true);
        }
    }, [editor, nodeKey, openInEditMode, setSelected, setEditing]);

    return (
        <CardContext.Provider value={{
            isSelected,
            isEditing,
            cardWidth,
            setCardWidth,
            selection,
            cardContainerRef: containerRef
        }}>
            <CardWrapper
                isSelected={isSelected}
                isEditing={isEditing}
                cardType={cardType}
                ref={containerRef}
                cardWidth={cardWidth}
                wrapperStyle={wrapperStyle}
            >
                {children}
            </CardWrapper>
        </CardContext.Provider>
    );
};

export default KoenigCardWrapperComponent;
