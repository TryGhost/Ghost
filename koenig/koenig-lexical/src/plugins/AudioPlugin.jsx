import React from 'react';
import {
    $getSelection,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection,
    $createNodeSelection,
    $setSelection,
    $isParagraphNode,
    $isNodeSelection
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {$createAudioNode, AudioNode, INSERT_AUDIO_COMMAND} from '../nodes/AudioNode';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';

export const AudioPlugin = () => {
    const [editor] = useLexicalComposerContext();

    const setNodeSelection = ({selection, selectedNode, newNode, dataset}) => {
        const selectedIsParagraph = $isParagraphNode(selectedNode);
        const selectedIsEmpty = selectedNode.getTextContent() === '';
        if (dataset.initialFile) {
            // Audio file was dragged/dropped directly into the editor
            // so we insert the AudioNode after the selected node
            selectedNode
                .getTopLevelElementOrThrow()
                .insertAfter(newNode);
            if (selectedIsParagraph && selectedIsEmpty) {
                selectedNode.remove();
            }
        } else {
            // Audio node was added without an initial file (via Slash or Plus menu)
            // so we insert the AudioNode before the selected node
            selectedNode
                .getTopLevelElementOrThrow()
                .insertBefore(newNode);
        }
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(newNode.getKey());
        $setSelection(nodeSelection);
    };

    React.useEffect(() => {
        if (!editor.hasNodes([AudioNode])){
            console.error('AudioPlugin: AudioNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_AUDIO_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();

                    let focusNode;
                    if ($isRangeSelection(selection)) {
                        focusNode = selection.focus.getNode();
                    } else if ($isNodeSelection(selection)) {
                        focusNode = selection.getNodes()[0];
                    } else {
                        return false;
                    }

                    if (focusNode !== null) {
                        const audioNode = $createAudioNode(dataset);
                        setNodeSelection({selection, selectedNode: focusNode, newNode: audioNode, dataset});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                INSERT_MEDIA_COMMAND,
                async (dataset) => {
                    if (dataset.type === 'audio') {
                        editor.dispatchCommand(INSERT_AUDIO_COMMAND, {initialFile: dataset.file});
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default AudioPlugin;
