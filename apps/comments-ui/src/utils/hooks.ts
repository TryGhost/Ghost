import {CommentsEditorConfig, getEditorConfig} from './editor';
import {Editor, useEditor as useTiptapEditor} from '@tiptap/react';
import {formatRelativeTime} from './helpers';
import {useAppContext} from '../AppContext';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

/**
 * Execute a callback when a ref is set and unset.
 * Warning: make sure setup and clear are both functions that do not change on every rerender. So use useCallback if required on them.
 */
export function useRefCallback<T>(setup: (element: T) => void, clear?: (element: T) => void) {
    const ref = useRef<T | null>(null);
    const setRef = useCallback((node) => {
        if (ref.current && clear) {
            // Make sure to cleanup any events/references added to the last instance
            clear(ref.current);
        }

        if (node && setup) {
            // Check if a node is actually passed. Otherwise node would be null.
            // You can now do what you need to, addEventListeners, measure, etc.
            setup(node);
        }

        // Save a reference to the node
        ref.current = node;
    }, [setup, clear]);
    return [ref, setRef];
}

export function usePopupOpen(type: string) {
    const {popup} = useAppContext();
    return popup?.type === type;
}

/**
 * Avoids a rerender of the relative time unless the date changed, and not the current timestamp changed
 */
export function useRelativeTime(dateString: string) {
    const {t} = useAppContext();
    return useMemo(() => {
        return formatRelativeTime(dateString, t);
    }, [dateString]);
}

export function useEditor(editorConfig: CommentsEditorConfig, initialHasContent = false): {editor: Editor | null, hasContent: boolean} {
    const [hasContent, setHasContent] = useState(initialHasContent);

    const _editorConfig = useMemo(() => ({
        ...getEditorConfig(editorConfig)
    }), [editorConfig]);

    const editor = useTiptapEditor(_editorConfig, [_editorConfig]);

    useEffect(() => {
        if (editor) {
            const checkContent = () => {
                const editorHasContent = !editor.isEmpty;
                setHasContent(editorHasContent);
            };

            editor.on('update', checkContent);
            editor.on('transaction', checkContent);

            checkContent();

            return () => {
                editor.off('update', checkContent);
                editor.off('transaction', checkContent);
            };
        }
    }, [editor]);

    return {
        editor,
        hasContent
    };
}
