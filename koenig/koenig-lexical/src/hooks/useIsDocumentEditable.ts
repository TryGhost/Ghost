import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LexicalEditor} from 'lexical';

export function topLevelEditor(editor: LexicalEditor): LexicalEditor {
    let topLevel = editor;
    while (topLevel._parentEditor) {
        topLevel = topLevel._parentEditor;
    }
    return topLevel;
}

// the top-level editor's flag says whether the document can change. A nested editor's
// own flag follows its card's edit mode, so it says nothing about the document
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

// state in a card that only a later mousedown would close, such as an open
// picker or name field, or it would be back once the editor is editable again
export function useResetWhenReadOnly(reset: () => void): void {
    const isEditable = useIsDocumentEditable();
    const latest = React.useRef(reset);

    React.useLayoutEffect(() => {
        latest.current = reset;
    });

    React.useEffect(() => {
        if (!isEditable) {
            latest.current();
        }
    }, [isEditable]);
}
