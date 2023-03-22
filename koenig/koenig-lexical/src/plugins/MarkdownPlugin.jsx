import React from 'react';
import {$createMarkdownNode, INSERT_MARKDOWN_COMMAND, MarkdownNode} from '../nodes/MarkdownNode';
import {COMMAND_PRIORITY_HIGH} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const MarkdownPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([MarkdownNode])){
            console.error('MarkdownPlugin: MarkdownNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_MARKDOWN_COMMAND,
                async (dataset) => {
                    const cardNode = $createMarkdownNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default MarkdownPlugin;
