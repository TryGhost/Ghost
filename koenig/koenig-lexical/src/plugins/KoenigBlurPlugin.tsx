import {BLUR_COMMAND, COMMAND_PRIORITY_EDITOR} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const KoenigBlurPlugin = ({onBlur}: {onBlur?: () => void}) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerCommand(
            BLUR_COMMAND,
            () => {
                onBlur?.();
                return false;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor, onBlur]);

    return null;
};
