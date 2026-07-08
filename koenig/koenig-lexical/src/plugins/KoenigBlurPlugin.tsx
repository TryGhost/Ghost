import {BLUR_COMMAND, COMMAND_PRIORITY_EDITOR} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const KoenigBlurPlugin = ({onBlur}) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        editor.registerCommand(
            BLUR_COMMAND,
            () => {
                onBlur?.();
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor, onBlur]);

    return null;
};
