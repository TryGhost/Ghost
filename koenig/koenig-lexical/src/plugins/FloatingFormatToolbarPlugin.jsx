import React, {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND
} from 'lexical';
import {
    $wrapNodes
} from '@lexical/selection';
import {
    $createHeadingNode,
    $isHeadingNode,
    $createQuoteNode
} from '@lexical/rich-text';
import {
    $isListNode,
    ListNode
} from '@lexical/list';
import {
    $getNearestNodeOfType,
    mergeRegister
} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createAsideNode} from '../nodes/AsideNode';
import {getSelectedNode} from '../utils/getSelectedNode';
import {setFloatingElemPosition} from '../utils/setFloatingElemPosition';
import {getDOMRangeRect} from '../utils/getDOMRangeRect';
import {getScrollParent} from '../utils/getScrollParent';
import {
    ToolbarMenu,
    ToolbarMenuItem,
    ToolbarMenuSeparator
} from '../components/ToolbarMenu/ToolbarMenu';

const blockTypeToBlockName = {
    bullet: 'Bulleted List',
    check: 'Check List',
    code: 'Code Block',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    h4: 'Heading 4',
    h5: 'Heading 5',
    h6: 'Heading 6',
    number: 'Numbered List',
    paragraph: 'Normal',
    quote: 'Quote',
    aside: 'Aside'
};

function FloatingFormatToolbar({isText, editor, anchorElem, blockType, isBold, isItalic}) {
    const [stickyToolbar, setStickyToolbar] = React.useState(false);
    const toolbarRef = React.useRef(null);
    // const [isVisible, setIsVisible] = React.useState(false);

    const formatParagraph = () => {
        if (blockType !== 'paragraph') {
            editor.update(() => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    $wrapNodes(selection, () => $createParagraphNode());
                }
            });
        }
    };

    const formatHeading = (headingSize) => {
        if (blockType !== headingSize) {
            editor.update(() => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    $wrapNodes(selection, () => $createHeadingNode(headingSize));
                }
            });
        }
    };

    const formatQuote = () => {
        editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
                if (blockType === 'quote') {
                    $wrapNodes(selection, () => $createAsideNode());
                } else if (blockType === 'aside') {
                    $wrapNodes(selection, () => $createParagraphNode());
                } else {
                    $wrapNodes(selection, () => $createQuoteNode());
                }
            }
        });
    };

    const updateFloatingToolbar = React.useCallback(() => {
        const toolbarElement = toolbarRef.current;

        if (!toolbarElement) {
            return;
        }

        const selection = $getSelection();
        const nativeSelection = window.getSelection();
        const rootElement = editor.getRootElement();

        if (
            selection !== null &&
            nativeSelection !== null &&
            !nativeSelection.isCollapsed &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode)
        ) {
            const rangeRect = getDOMRangeRect(nativeSelection, rootElement);
            if (!stickyToolbar) {
                setFloatingElemPosition(rangeRect, toolbarElement, anchorElem);
            }
        }
    }, [editor, anchorElem, stickyToolbar]);

    const toggleVis = React.useCallback(() => {
        if (isText !== false) {
            toolbarRef.current.style.opacity = '1';
        }
    }, [isText]);

    React.useEffect(() => {
        editor.getEditorState().read(() => {
            updateFloatingToolbar();
        });
        document.addEventListener('mouseup', toggleVis);
        return () => {
            document.removeEventListener('mouseup', toggleVis);
        };
    }, [toggleVis, editor, updateFloatingToolbar]);

    React.useEffect(() => {
        editor.getEditorState().read(() => {
            updateFloatingToolbar();
        });
        const shiftUp = (e) => {
            if (e.key === 'Shift') {
                toggleVis();
            }
        };
        document.addEventListener('keyup', shiftUp);
        return () => {
            document.removeEventListener('keyup', shiftUp);
        };
    }, [toggleVis, editor, updateFloatingToolbar]);

    React.useEffect(() => {
        const scrollElement = getScrollParent(anchorElem);

        const update = () => {
            editor.getEditorState().read(() => {
                updateFloatingToolbar();
            });
        };

        window.addEventListener('resize', update);
        if (scrollElement) {
            scrollElement.addEventListener('scroll', update);
        }

        return () => {
            window.removeEventListener('resize', update);
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', update);
            }
        };
    }, [editor, updateFloatingToolbar, anchorElem]);

    React.useEffect(() => {
        editor.getEditorState().read(() => {
            updateFloatingToolbar();
        });

        return mergeRegister(
            editor.registerUpdateListener(({editorState}) => {
                editorState.read(() => {
                    updateFloatingToolbar();
                });
            }),

            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateFloatingToolbar();
                    return false;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor, updateFloatingToolbar]);

    return (
        <div className={`absolute`} ref={toolbarRef} data-kg-floating-toolbar style={{opacity: 0}}>
            <ToolbarMenu>
                <ToolbarMenuItem label="Format text as bold" isActive={isBold} icon="bold" onClick={() => {
                    setStickyToolbar(true);
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
                }} data-kg-toolbar-button="bold" />
                <ToolbarMenuItem label="Format text as italics" isActive={isItalic} icon="italic" onClick={() => {
                    setStickyToolbar(true);
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
                }} data-kg-toolbar-button="italic" />
                <ToolbarMenuItem label="Toggle heading 1" isActive={blockType === 'h2'} icon="headingOne" onClick={() => {
                    (blockType === 'h2' ? formatParagraph() : formatHeading('h2'));
                    setStickyToolbar(true);
                }} data-kg-toolbar-button="h2" />
                <ToolbarMenuItem label="Toggle heading 2" isActive={blockType === 'h3'} icon="headingTwo" onClick={() => {
                    (blockType === 'h3' ? formatParagraph() : formatHeading('h3'));
                    setStickyToolbar(true);
                }} data-kg-toolbar-button="h3" />
                <ToolbarMenuSeparator />
                <ToolbarMenuItem label="Toggle blockquote" isActive={blockType === 'quote' || blockType === 'aside'} icon={blockType === 'aside' ? 'quoteOne' : 'quoteTwo'} onClick={() => {
                    (formatQuote());
                    setStickyToolbar(true);
                }} data-kg-toolbar-button="quote" />
            </ToolbarMenu>
        </div>
    );
}

function useFloatingFormatToolbar(editor, anchorElem) {
    const [isText, setIsText] = React.useState(false);
    const [isBold, setIsBold] = React.useState(false);
    const [isItalic, setIsItalic] = React.useState(false);
    const [blockType, setBlockType] = React.useState('paragraph');

    const updatePopup = React.useCallback(() => {
        editor.getEditorState().read(() => {
            // Should not to pop up the floating toolbar when using IME input
            if (editor.isComposing()) {
                return;
            }
            const selection = $getSelection();
            const nativeSelection = window.getSelection();
            const rootElement = editor.getRootElement();

            if (
                nativeSelection !== null &&
                (
                    !$isRangeSelection(selection) ||
                    rootElement === null ||
                    !rootElement.contains(nativeSelection.anchorNode)
                )
            ) {
                setIsText(false);
                return;
            }

            if (!$isRangeSelection(selection)) {
                return;
            }

            const anchorNode = getSelectedNode(selection);
            const element = anchorNode.getKey() === 'root'
                ? anchorNode
                : anchorNode.getTopLevelElementOrThrow();
            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);

            // update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));

            if (elementDOM !== null) {
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const type = parentList
                        ? parentList.getListType()
                        : element.getListType();
                    setBlockType(type);
                } else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();

                    if (type in blockTypeToBlockName) {
                        setBlockType(type);
                    }
                }
            }

            if (selection.getTextContent() !== '') {
                setIsText($isTextNode(anchorNode));
            } else {
                setIsText(false);
            }
        });
    }, [editor]);

    useEffect(() => {
        document.addEventListener('selectionchange', updatePopup);
        return () => {
            document.removeEventListener('selectionchange', updatePopup);
        };
    }, [updatePopup]);

    useEffect(() => {
        return editor.registerUpdateListener(() => {
            updatePopup();
        });
    }, [editor, updatePopup]);

    if (!isText) {
        return;
    }

    return createPortal(
        <FloatingFormatToolbar
            isText={isText}
            editor={editor}
            anchorElem={anchorElem}
            blockType={blockType}
            isBold={isBold}
            isItalic={isItalic}
        />,
        anchorElem
    );
}

export default function FloatingFormatToolbarPlugin({anchorElem = document.body}) {
    const [editor] = useLexicalComposerContext();
    return useFloatingFormatToolbar(editor, anchorElem);
}
