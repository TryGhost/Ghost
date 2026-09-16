import {COMMAND_PRIORITY_EDITOR, FOCUS_COMMAND} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const KoenigFocusPlugin = ({onFocus}) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        editor.registerCommand(
            FOCUS_COMMAND,
            () => {
                onFocus?.();
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor, onFocus]);

    return null;
};
