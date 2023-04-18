import Portal from '../components/ui/Portal';
import React, {useEffect} from 'react';
import {$createAsideNode} from '../nodes/AsideNode';
import {
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode
} from '@lexical/rich-text';
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
    $getNearestNodeOfType,
    mergeRegister
} from '@lexical/utils';
import {
    $isListNode,
    ListNode
} from '@lexical/list';
import {
    $wrapNodes,
    createDOMRange,
    createRectsFromDOMRange
} from '@lexical/selection';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {
    ToolbarMenu,
    ToolbarMenuItem,
    ToolbarMenuSeparator
} from '../components/ui/ToolbarMenu';
import {getScrollParent} from '../utils/getScrollParent';
import {getSelectedNode} from '../utils/getSelectedNode';
import {setFloatingElemPosition} from '../utils/setFloatingElemPosition';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

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

const toolbarItemTypes = {
    snippet: 'snippet'
};

function FloatingFormatToolbar({
    isText,
    editor,
    anchorElem,
    blockType,
    isBold,
    isItalic,
    isSnippetsEnabled,
    toolbarItemType,
    setToolbarItemType,
    setIsText
}) {
    const [stickyToolbar, setStickyToolbar] = React.useState(false);
    const toolbarRef = React.useRef(null);

    let hideHeading = false;
    if (!editor.hasNodes([HeadingNode])){
        hideHeading = true;
    }

    let hideQuotes = false;
    if (!editor.hasNodes([QuoteNode])){
        hideQuotes = true;
    }

    let hideSnippets = !isSnippetsEnabled;
    if (editor._parentEditor) {
        hideSnippets = true;
    }

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
        const selection = $getSelection();

        if (!toolbarElement || !$isRangeSelection(selection)) {
            return;
        }

        const anchor = selection.anchor;
        const focus = selection.focus;
        const selectionRange = createDOMRange(editor, anchor.getNode(), selection.anchor.offset, focus.getNode(), selection.focus.offset);
        const selectionRects = createRectsFromDOMRange(editor, selectionRange);
        const rangeRect = selectionRects[0];

        if (rangeRect && !stickyToolbar) {
            setFloatingElemPosition(rangeRect, toolbarElement, anchorElem);
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

    const handleSnippetItemClick = () => {
        setToolbarItemType(toolbarItemTypes.snippet);
    };

    const handleSnippetClose = () => {
        setToolbarItemType(null);
        setIsText(false);
    };

    const isSnippetVisible = toolbarItemTypes.snippet === toolbarItemType;

    return (
        <div ref={toolbarRef} className="not-kg-prose fixed z-[10000]" style={{opacity: 0}} data-kg-floating-toolbar>
            {isSnippetVisible && <SnippetActionToolbar onClose={handleSnippetClose}/>}

            <ToolbarMenu hide={isSnippetVisible}>
                <ToolbarMenuItem data-kg-toolbar-button="bold" icon="bold" isActive={isBold} label="Format text as bold" onClick={() => {
                    setStickyToolbar(true);
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
                }} />
                <ToolbarMenuItem data-kg-toolbar-button="italic" icon="italic" isActive={isItalic} label="Format text as italics" onClick={() => {
                    setStickyToolbar(true);
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
                }} />
                <ToolbarMenuItem data-kg-toolbar-button="h2" hide={hideHeading} icon="headingOne" isActive={blockType === 'h2'} label="Toggle heading 1" onClick={() => {
                    (blockType === 'h2' ? formatParagraph() : formatHeading('h2'));
                    setStickyToolbar(true);
                }} />
                <ToolbarMenuItem data-kg-toolbar-button="h3" hide={hideHeading} icon="headingTwo" isActive={blockType === 'h3'} label="Toggle heading 2" onClick={() => {
                    (blockType === 'h3' ? formatParagraph() : formatHeading('h3'));
                    setStickyToolbar(true);
                }} />
                <ToolbarMenuSeparator hide={hideQuotes} />
                <ToolbarMenuItem data-kg-toolbar-button="quote" hide={hideQuotes} icon={blockType === 'aside' ? 'quoteOne' : 'quoteTwo'} isActive={blockType === 'quote' || blockType === 'aside'} label="Toggle blockquote" onClick={() => {
                    (formatQuote());
                    setStickyToolbar(true);
                }} />

                <ToolbarMenuSeparator hide={hideSnippets} />
                <ToolbarMenuItem
                    hide={hideSnippets}
                    icon="snippet"
                    isActive={false}
                    label="Snippet"
                    onClick={handleSnippetItemClick}
                />
            </ToolbarMenu>
        </div>
    );
}

function useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled) {
    const [isText, setIsText] = React.useState(false);
    const [isBold, setIsBold] = React.useState(false);
    const [isItalic, setIsItalic] = React.useState(false);
    const [blockType, setBlockType] = React.useState('paragraph');
    const [toolbarItemType, setToolbarItemType] = React.useState(null);

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
                ) && !toolbarItemType
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
    }, [editor, toolbarItemType]);

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

    return (
        <Portal>
            <FloatingFormatToolbar
                anchorElem={anchorElem}
                blockType={blockType}
                editor={editor}
                isBold={isBold}
                isItalic={isItalic}
                isSnippetsEnabled={isSnippetsEnabled}
                isText={isText}
                setIsText={setIsText}
                setToolbarItemType={setToolbarItemType}
                toolbarItemType={toolbarItemType}
            />
        </Portal>
    );
}

export default function FloatingFormatToolbarPlugin({anchorElem = document.body, isSnippetsEnabled}) {
    const [editor] = useLexicalComposerContext();
    return useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled);
}
