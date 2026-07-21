import {COMMAND_PRIORITY_EDITOR, FOCUS_COMMAND} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const KoenigFocusPlugin = ({onFocus}: {onFocus?: () => void}) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        editor.registerCommand(
            FOCUS_COMMAND,
            () => {
                onFocus?.();
                return false;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor, onFocus]);

    return null;
};
