import React from 'react';
import {$createAudioNode, AudioNode, INSERT_AUDIO_COMMAND} from '../nodes/AudioNode';
import {
    $getSelection,
    $isNodeSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH
} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const AudioPlugin = () => {
    const [editor] = useLexicalComposerContext();

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
                        $insertAndSelectNode({selectedNode: focusNode, newNode: audioNode});
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
