import React from 'react';
import {$createParagraphNode, $getSelection, COMMAND_PRIORITY_LOW, createCommand} from 'lexical';
import {$generateNodesFromSerializedNodes, $insertGeneratedNodes} from '@lexical/clipboard';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
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
                        const firstNode = nodes.length === 1 && nodes[0];
                        const lastNode = !!nodes.length && nodes[nodes.length - 1];

                        if (firstNode && $isKoenigCard(firstNode)) {
                            editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode: firstNode});

                            return true;
                        }

                        const selection = $getSelection();
                        $insertGeneratedNodes(editor, nodes, selection);

                        if (lastNode && $isKoenigCard(lastNode) && !lastNode.getNextSibling()) {
                            const paragraph = $createParagraphNode();
                            lastNode.getTopLevelElementOrThrow().insertAfter(paragraph);
                        }
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
