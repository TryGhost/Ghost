import React from 'react';
import {$createEmailCtaNode, EmailCtaNode, INSERT_EMAIL_CTA_COMMAND} from '../nodes/EmailCtaNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const EmailCtaPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([EmailCtaNode])){
            console.error('EmailPlugin: EmailCtaNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_EMAIL_CTA_COMMAND,
                (_dataset: Record<string, unknown>) => {
                    const cardNode = $createEmailCtaNode();
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default EmailCtaPlugin;