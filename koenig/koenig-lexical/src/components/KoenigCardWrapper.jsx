import React from 'react';
import {
    $createNodeSelection,
    $createParagraphNode,
    $getNodeByKey,
    $getSelection,
    $isDecoratorNode,
    $isNodeSelection,
    $setSelection,
    BLUR_COMMAND,
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

const KoenigCardWrapperComponent = ({nodeKey, children}) => {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
    const [selection, setSelection] = React.useState(null);
    const ref = React.useRef(null);

    React.useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({editorState}) => {
                setSelection(editorState.read(() => $getSelection()));
            }),
            editor.registerCommand(
                CLICK_COMMAND,
                (event) => {
                    if (ref.current.contains(event.target)) {
                        clearSelected();
                        setSelected(true);
                    } else if (isSelected) {
                        setSelected(false);
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                BLUR_COMMAND,
                (event) => {
                    if (isSelected && !ref.current.contains(event.relatedTarget)) {
                        clearSelected();
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (event) => {
                    // TODO: test if this is needed when code card is working again
                    // we don't want to insert paragraphs if Enter is pressed inside card's form element
                    // if (event.target.matches('input textarea select option')) {
                    //     return false;
                    // }

                    const latestSelection = $getSelection();
                    if (isSelected && $isNodeSelection(latestSelection) && latestSelection.getNodes().length === 1) {
                        event.preventDefault();
                        const cardNode = $getNodeByKey(nodeKey);
                        const paragraphNode = $createParagraphNode();
                        cardNode.getTopLevelElementOrThrow().insertAfter(paragraphNode);
                        paragraphNode.select();
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_EDITOR
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                (event) => {
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
    }, [editor, isSelected, setSelected, clearSelected, nodeKey]);

    const isFocused = $isNodeSelection(selection) && isSelected;

    return (
        <div
            className={`relative border border-transparent caret-grey-800 ${isFocused ? 'shadow-[0_0_0_2px] shadow-green' : 'hover:shadow-[0_0_0_1px] hover:shadow-green'}`}
            ref={ref}
            data-kg-card
            data-kg-card-selected={isFocused}
        >
            {children}
        </div>
    );
};

export default KoenigCardWrapperComponent;
