import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
    $createNodeSelection,
    $getSelection,
    $isDecoratorNode,
    $isNodeSelection,
    $isRangeSelection,
    $setSelection,
    $createTextNode,
    COMMAND_PRIORITY_HIGH,
    KEY_ARROW_DOWN_COMMAND,
    KEY_ARROW_UP_COMMAND,
    KEY_BACKSPACE_COMMAND,
    PASTE_COMMAND
} from 'lexical';

import {$createLinkNode} from '@lexical/link';
import {mergeRegister} from '@lexical/utils';

const RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX = 10;

function $selectDecoratorNode(node) {
    const nodeSelection = $createNodeSelection();
    nodeSelection.add(node.getKey());
    $setSelection(nodeSelection);
}

function getTopLevelNativeElement(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }

    const selector = '[data-lexical-editor] > *';
    return node.closest(selector);
}

function useKoenigBehaviour({editor, containerElem}) {
    // deselect cards on mousedown outside of the editor container
    React.useEffect(() => {
        const onMousedown = (event) => {
            if (!containerElem.current.contains(event.target)) {
                editor.update(() => {
                    const selection = $getSelection();

                    if ($isNodeSelection(selection)) {
                        $setSelection(null);
                    }
                });
            }
        };

        window.addEventListener('mousedown', onMousedown);

        return () => {
            window.removeEventListener('mousedown', onMousedown);
        };
    }, [editor, containerElem]);

    // override built-in keyboard movement around card (DecoratorNode) boundaries,
    // cards should be selected on up/down and when deleting content around them
    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                KEY_ARROW_UP_COMMAND,
                () => {
                    const selection = $getSelection();

                    if ($isNodeSelection(selection)) {
                        const currentNode = selection.getNodes()[0];
                        const previousSibling = currentNode.getPreviousSibling();

                        // do nothing if decorator node is top of document and selected
                        // TODO: handle exposing this in some way so consuming app can
                        //   can control this behaviour
                        if (!previousSibling) {
                            return true;
                        }

                        if ($isDecoratorNode(previousSibling)) {
                            $selectDecoratorNode(previousSibling);
                            return true;
                        }
                    }

                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed) {
                            const topLevelElement = selection.anchor.getNode().getTopLevelElement();
                            const nativeSelection = window.getSelection();

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
                                const range = nativeSelection.getRangeAt(0).cloneRange();
                                const rects = range.getClientRects();

                                if (rects.length > 0) {
                                    // try second rect first because when the caret is at the beginning
                                    // of a line the first rect will be positioned on line above breaking
                                    // the top position check
                                    const rangeRect = rects[1] || rects[0];
                                    const nativeTopLevelElement = getTopLevelNativeElement(nativeSelection.anchorNode);
                                    const elemRect = nativeTopLevelElement.getBoundingClientRect();

                                    const atTopOfNode = Math.abs(rangeRect.top - elemRect.top) <= RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX;

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
                    }

                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                KEY_ARROW_DOWN_COMMAND,
                () => {
                    const selection = $getSelection();

                    if ($isNodeSelection(selection)) {
                        const currentNode = selection.getNodes()[0];
                        const nextSibling = currentNode.getNextSibling();

                        if ($isDecoratorNode(nextSibling)) {
                            $selectDecoratorNode(nextSibling);
                            return true;
                        }
                    }

                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed) {
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
                                    const rangeRect = rects[0];
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
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                (event) => {
                    const selection = $getSelection();

                    // <KoenigCardWrapper> currently handles the behaviour for
                    // backspace on a selected card
                    if ($isNodeSelection(selection)) {
                        return false;
                    }

                    if ($isRangeSelection(selection)) {
                        if (selection.isCollapsed) {
                            const topLevelElement = selection.anchor.getNode().getTopLevelElement();
                            const previousSibling = topLevelElement.getPreviousSibling();

                            const onEmptyNode =
                                topLevelElement?.getTextContent().trim() === '' &&
                                selection.anchor.offset === 0;

                            if (onEmptyNode && $isDecoratorNode(previousSibling)) {
                                // delete the empty node and select the previous card
                                topLevelElement.remove();
                                $selectDecoratorNode(previousSibling);
                                return true;
                            }

                            const atStartOfElement =
                                selection.anchor.offset === 0 &&
                                selection.focus.offset === 0;

                            if (atStartOfElement && $isDecoratorNode(previousSibling)) {
                                // delete the previous card keeping caret in place
                                event.preventDefault();
                                previousSibling.remove();
                                return true;
                            }
                        }
                    }

                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                PASTE_COMMAND,
                (clipboard) => {
                    const clipboardDataset = clipboard?.clipboardData?.getData('text');
                    const linkMatch = clipboardDataset?.match(/^(https?:\/\/[^\s]+)$/); // replace with better regex to include more protocols like mailto, ftp, etc
                    const selection = $getSelection();
                    const selectionContent = selection.getTextContent();
                    if (linkMatch && selectionContent.length > 0) {
                        const link = linkMatch[1];
                        if ($isRangeSelection(selection)) {
                            const textNode = selection.extract()[0];
                            const linkNode = $createLinkNode(link);
                            const linkTextNode = $createTextNode(selectionContent);
                            linkTextNode.setFormat(textNode.getFormat());
                            linkNode.append(linkTextNode);
                            textNode.replace(linkNode);
                        }
                        return true;
                    }
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    });

    return null;
}

export default function KoenigBehaviourPlugin({containerElem = document.querySelector('.koenig-editor')}) {
    const [editor] = useLexicalComposerContext();
    return useKoenigBehaviour({editor, containerElem});
}
