import React from 'react';
import {$createArtifactNode, $isArtifactNode, ArtifactNode, INSERT_ARTIFACT_COMMAND} from '../nodes/ArtifactNode';
import {$getNodeByKey, $getRoot, COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function createArtifactId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const ArtifactPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([ArtifactNode])) {
            console.error('ArtifactPlugin: ArtifactNode not registered');
            return;
        }

        return mergeRegister(
            editor.registerUpdateListener(({editorState}) => {
                const duplicateKeys = editorState.read(() => {
                    const seenIds = new Set();

                    return $getRoot().getChildren().filter($isArtifactNode).flatMap((node) => {
                        if (!node.id || seenIds.has(node.id)) {
                            return [node.getKey()];
                        }

                        seenIds.add(node.id);
                        return [];
                    });
                });

                if (duplicateKeys.length === 0) {
                    return;
                }

                editor.update(() => {
                    duplicateKeys.forEach((key) => {
                        const node = $getNodeByKey(key);
                        if ($isArtifactNode(node)) {
                            node.id = createArtifactId();
                        }
                    });
                });
            }),
            editor.registerCommand(
                INSERT_ARTIFACT_COMMAND,
                (dataset = {}) => {
                    const cardNode = $createArtifactNode({id: createArtifactId(), ...dataset});
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: false});
                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default ArtifactPlugin;
