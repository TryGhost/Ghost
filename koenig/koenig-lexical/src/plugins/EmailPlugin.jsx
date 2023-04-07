import React from 'react';
import {$createEmailNode, EmailNode, INSERT_EMAIL_COMMAND} from '../nodes/EmailNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const EmailPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([EmailNode])){
            console.error('EmailPlugin: EmailNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_EMAIL_COMMAND,
                async (dataset) => {
                    const cardNode = $createEmailNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default EmailPlugin;