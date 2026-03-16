import React from 'react';
import {$createTransistorNode, INSERT_TRANSISTOR_COMMAND, TransistorNode} from '../nodes/TransistorNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const TransistorPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([TransistorNode])) {
            throw new Error('TransistorPlugin: TransistorNode not registered');
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_TRANSISTOR_COMMAND,
                async (dataset) => {
                    const cardNode = $createTransistorNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default TransistorPlugin;
