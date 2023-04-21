import React from 'react';
import {LinkInput} from './LinkInput.jsx';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function LinkActionToolbar({href, onClose}) {
    const [editor] = useLexicalComposerContext();
    return (
        <LinkInput
            cancel={onClose}
            href={href}
            update={(_href) => {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, _href || null);
                onClose();
            }}
        />
    );
}
