import React from 'react';
import {
    $getSelection,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {$createMarkdownNode, MarkdownNode, INSERT_MARKDOWN_COMMAND} from '../nodes/MarkdownNode';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';

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
                        $insertAndSelectNode({selectedNode: focusNode, newNode: markdownNode});
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
