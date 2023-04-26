import React from 'react';
import {$createAsideNode} from '../../nodes/AsideNode';
import {
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode
} from '@lexical/rich-text';
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND
} from 'lexical';
import {$getNearestNodeOfType} from '@lexical/utils';
import {$isListNode, ListNode} from '@lexical/list';
import {$wrapNodes} from '@lexical/selection';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
    ToolbarMenu,
    ToolbarMenuItem,
    ToolbarMenuSeparator
} from './ToolbarMenu';
import {getSelectedNode} from '../../utils/getSelectedNode';

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

export default function FormatToolbar({
    editor,
    isSnippetsEnabled,
    isLinkSelected,
    onLinkClick,
    onSnippetClick,
    arrowStyles
}) {
    const [isBold, setIsBold] = React.useState(false);
    const [isItalic, setIsItalic] = React.useState(false);
    const [blockType, setBlockType] = React.useState('paragraph');

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

    const updateState = React.useCallback(() => {
        editor.getEditorState().read(() => {
            // Should not to pop up the floating toolbar when using IME input
            if (editor.isComposing()) {
                return;
            }

            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return;
            }
            // update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));

            const anchorNode = getSelectedNode(selection);
            const element = anchorNode.getKey() === 'root'
                ? anchorNode
                : anchorNode.getTopLevelElementOrThrow();
            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);

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
        });
    }, [editor]);

    React.useEffect(() => {
        updateState();

        return editor.registerUpdateListener(() => {
            updateState();
        });
    }, [editor, updateState]);

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

    return (
        <ToolbarMenu arrowStyles={arrowStyles}>
            <ToolbarMenuItem
                data-kg-toolbar-button="bold"
                icon="bold"
                isActive={isBold}
                label="Format text as bold"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
            />
            <ToolbarMenuItem
                data-kg-toolbar-button="italic"
                icon="italic"
                isActive={isItalic}
                label="Format text as italics"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
            />
            <ToolbarMenuItem
                data-kg-toolbar-button="h2"
                hide={hideHeading}
                icon="headingOne"
                isActive={blockType === 'h2'}
                label="Toggle heading 1"
                onClick={() => (blockType === 'h2' ? formatParagraph() : formatHeading('h2'))}
            />
            <ToolbarMenuItem
                data-kg-toolbar-button="h3"
                hide={hideHeading}
                icon="headingTwo"
                isActive={blockType === 'h3'}
                label="Toggle heading 2"
                onClick={() => (blockType === 'h3' ? formatParagraph() : formatHeading('h3'))}
            />
            <ToolbarMenuSeparator hide={hideQuotes} />
            <ToolbarMenuItem
                data-kg-toolbar-button="quote"
                hide={hideQuotes}
                icon={blockType === 'aside' ? 'quoteOne' : 'quoteTwo'}
                isActive={blockType === 'quote' || blockType === 'aside'}
                label="Toggle blockquote"
                onClick={formatQuote}
            />

            <ToolbarMenuItem
                data-kg-toolbar-button="link"
                icon="link"
                isActive={!!isLinkSelected}
                label="Link"
                onClick={onLinkClick}
            />

            <ToolbarMenuSeparator hide={hideSnippets} />
            <ToolbarMenuItem
                data-kg-toolbar-button="snippet"
                hide={hideSnippets}
                icon="snippet"
                isActive={false}
                label="Snippet"
                onClick={onSnippetClick}
            />
        </ToolbarMenu>
    );
}
