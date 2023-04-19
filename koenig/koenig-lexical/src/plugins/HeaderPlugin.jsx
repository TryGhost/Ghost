import React from 'react';
import {$createHeaderNode, HeaderNode, INSERT_HEADER_COMMAND} from '../nodes/HeaderNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const HeaderPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([HeaderNode])){
            console.error('HeaderPlugin: CalloutNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_HEADER_COMMAND,
                async (dataset) => {
                    const cardNode = $createHeaderNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    return null;
};

export default HeaderPlugin;
