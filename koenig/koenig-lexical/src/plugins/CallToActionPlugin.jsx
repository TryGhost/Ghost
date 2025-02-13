import React from 'react';
import {$createCallToActionNode, CallToActionNode, INSERT_CALL_TO_ACTION_COMMAND} from '../nodes/CallToActionNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CallToActionPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([CallToActionNode])){
            console.error('CallToActionPlugin: CallToActionNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_CALL_TO_ACTION_COMMAND,
                async (dataset) => {
                    const cardNode = $createCallToActionNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default CallToActionPlugin;
