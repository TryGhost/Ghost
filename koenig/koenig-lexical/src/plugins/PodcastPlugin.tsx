import React from 'react';
import {$createPodcastNode, INSERT_PODCAST_COMMAND, PodcastNode} from '../nodes/PodcastNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const PodcastPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([PodcastNode])) {
            throw new Error('PodcastPlugin: PodcastNode not registered');
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_PODCAST_COMMAND,
                async (dataset) => {
                    const cardNode = $createPodcastNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default PodcastPlugin;
