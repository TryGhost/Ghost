import React from 'react';
import {
    $getSelection,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection,
    $createNodeSelection,
    $setSelection,
    $isParagraphNode
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {$createMarkdownNode, MarkdownNode, INSERT_MARKDOWN_COMMAND} from '../nodes/MarkdownNode';

export const MarkdownPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([MarkdownNode])){
            console.error('MarkdownPlugin: MarkdownNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_MARKDOWN_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();

                    if (!$isRangeSelection(selection)) {
                        return false;
                    }

                    const focusNode = selection.focus.getNode();

                    if (focusNode !== null) {
                        const markdownNode = $createMarkdownNode({...dataset, _openInEditMode: true});

                        // insert a paragraph if this will be the last card and
                        // we're not already on a blank paragraph so we always
                        // have a trailing paragraph in the doc

                        const selectedNode = selection.focus.getNode();
                        const selectedIsBlankParagraph = $isParagraphNode(selectedNode) && selectedNode.getTextContent() === '';
                        const nextNode = selectedNode.getTopLevelElementOrThrow().getNextSibling();
                        if (!selectedIsBlankParagraph && !nextNode) {
                            selection.insertParagraph();
                        }

                        selection.focus
                            .getNode()
                            .getTopLevelElementOrThrow()
                            .insertBefore(markdownNode);

                        // move the focus away from the paragraph to the inserted
                        // decorator node
                        const nodeSelection = $createNodeSelection();
                        nodeSelection.add(markdownNode.getKey());
                        $setSelection(nodeSelection);
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default MarkdownPlugin;
