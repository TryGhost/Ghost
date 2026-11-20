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

// Lexical copies the top-level editor's editable flag to every nested editor
// when it changes. A card whose editors follow its edit mode puts them back
// afterwards, or a card that is not being edited would be typable once a
// read-only editor is editable again
export function useEditModeAfterReadOnly(isEditing: boolean, ...editors: LexicalEditor[]): void {
    const [editor] = useLexicalComposerContext();
    const topLevel = topLevelEditor(editor);
    const latest = React.useRef({isEditing, editors});

    React.useLayoutEffect(() => {
        latest.current = {isEditing, editors};
    });

    React.useEffect(() => {
        return topLevel.registerEditableListener((isEditable) => {
            if (!isEditable) {
                return;
            }

            // once every listener has run, Lexical's own among them
            queueMicrotask(() => {
                if (!topLevel.isEditable()) {
                    return;
                }
                for (const nested of latest.current.editors) {
                    nested.setEditable(latest.current.isEditing);
                }
            });
        });
    }, [topLevel]);
}
