import React from 'react';
import {$createAudioNode, AudioNode, INSERT_AUDIO_COMMAND} from '../nodes/AudioNode';
import {COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
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
                    const cardNode = $createAudioNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
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
