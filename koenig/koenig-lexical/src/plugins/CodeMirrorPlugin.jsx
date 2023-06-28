import React from 'react';
import {COMMAND_PRIORITY_CRITICAL, COMMAND_PRIORITY_HIGH, COPY_COMMAND, CUT_COMMAND, UNDO_COMMAND} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CodeMirrorPlugin = () => {
    const [editor] = useLexicalComposerContext();

    // stub some lexical handling because we want the code editor to have code editor behaviours
    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                UNDO_COMMAND, () => {
                    return true;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                COPY_COMMAND, () => {
                    return true;
                },
                COMMAND_PRIORITY_CRITICAL // critical to supersede the mobiledoc copy plugin
            ),
            editor.registerCommand(
                CUT_COMMAND, () => {
                    return true;
                },
                COMMAND_PRIORITY_CRITICAL // critical to supersede the mobiledoc copy plugin
            )
        );
    }, [editor]);
};