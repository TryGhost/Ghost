import React from 'react';
import {$createEmbedNode, EmbedNode, INSERT_EMBED_COMMAND} from '../nodes/EmbedNode';
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH
} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const EmbedPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([EmbedNode])){
            console.error('EmbedPlugin: EmbedNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_EMBED_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();

                    if (!$isRangeSelection(selection)) {
                        return false;
                    }

                    const focusNode = selection.focus.getNode();

                    if (focusNode !== null) {
                        const embedNode = $createEmbedNode({...dataset, _openInEditMode: true});
                        $insertAndSelectNode({selectedNode: focusNode, newNode: embedNode});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default EmbedPlugin;
