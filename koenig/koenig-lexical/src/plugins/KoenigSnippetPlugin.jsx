import React from 'react';
import {$generateNodesFromSerializedNodes, $insertGeneratedNodes} from '@lexical/clipboard';
import {$getSelection, COMMAND_PRIORITY_LOW, createCommand} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const INSERT_SNIPPET_COMMAND = createCommand('INSERT_SNIPPET_COMMAND');

export const KoenigSnippetPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                INSERT_SNIPPET_COMMAND,
                async (dataset) => {
                    editor.update(() => {
                        const snippetData = JSON.parse(dataset.value);
                        const nodes = $generateNodesFromSerializedNodes(snippetData.nodes);
                        const selection = $getSelection();
                        $insertGeneratedNodes(editor, nodes, selection);
                    });
                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
        );
    }, [editor]);

    return null;
};

export default KoenigSnippetPlugin;
