import React from 'react';
import {LinkInput} from './LinkInput.jsx';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function LinkActionToolbar({onClose, isLink}) {
    const [editor] = useLexicalComposerContext();
    const [value, setValue] = React.useState('');

    const handleChange = (href) => {
        setValue(href);
        if (isLink && !href) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, href);
        }

        onClose();
    };

    return (
        <LinkInput
            cancel={onClose}
            href={value}
            update={handleChange}
        />
    );
}
