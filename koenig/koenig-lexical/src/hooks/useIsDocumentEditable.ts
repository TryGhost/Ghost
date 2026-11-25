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

// Lexical copies the top-level flag to every nested editor when it changes, so a card puts its
// editors back to its edit mode, or a closed card would be typable once editable again
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
