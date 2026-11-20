import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LexicalEditor} from 'lexical';

function topLevelEditor(editor: LexicalEditor): LexicalEditor {
    let topLevel = editor;
    while (topLevel._parentEditor) {
        topLevel = topLevel._parentEditor;
    }
    return topLevel;
}

// whether the document can be changed at all is the top-level editor's editable
// flag. A nested editor has a flag of its own, which its card switches as the
// card is edited, so it says nothing about the document
export function isDocumentEditable(editor: LexicalEditor): boolean {
    return topLevelEditor(editor).isEditable();
}

export function useIsDocumentEditable(): boolean {
    const [editor] = useLexicalComposerContext();
    const topLevel = topLevelEditor(editor);

    const subscribe = React.useCallback((onChange: () => void) => {
        return topLevel.registerEditableListener(onChange);
    }, [topLevel]);

    return React.useSyncExternalStore(subscribe, () => topLevel.isEditable());
}
