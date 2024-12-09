import {CommentsEditorConfig, getEditorConfig} from './editor';
import {Editor, useEditor as useTiptapEditor} from '@tiptap/react';
import {formatRelativeTime} from './helpers';
import {useAppContext} from '../AppContext';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

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

type OutOfViewport = {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
}
type OutOfViewportClassOptions = {
    default: string;
    outOfViewport: string;
}
type OutOfViewportClasses = {
    top?: OutOfViewportClassOptions;
    bottom?: OutOfViewportClassOptions;
    left?: OutOfViewportClassOptions;
    right?: OutOfViewportClassOptions;
};
// TODO: This does not currently handle the case where the element is outOfViewport for both top&bottom or left&right
export function useOutOfViewportClasses(ref: React.RefObject<HTMLElement>, classes: OutOfViewportClasses) {
    // Add/Remove classes directly on the element based on whether it's out of the viewport
    // Modifies element classes directly in DOM so it's compatible with useLayoutEffect
    const applyDefaultClasses = useCallback(() => {
        if (ref.current) {
            for (const value of Object.values(classes)) {
                ref.current.classList.add(...value.default.split(' '));
                ref.current.classList.remove(...value.outOfViewport.split(' '));
            }
        }
    }, [ref, classes]);

    const applyOutOfViewportClasses = useCallback((outOfViewport: OutOfViewport) => {
        if (ref.current) {
            for (const [side, sideClasses] of Object.entries(classes)) {
                if (outOfViewport[side as keyof OutOfViewport]) {
                    ref.current.classList.add(...sideClasses.outOfViewport.split(' '));
                    ref.current.classList.remove(...sideClasses.default.split(' '));
                } else {
                    ref.current.classList.add(...sideClasses.default.split(' '));
                    ref.current.classList.remove(...sideClasses.outOfViewport.split(' '));
                }
            }
        }
    }, [ref, classes]);

    const updateOutOfViewportClasses = useCallback(() => {
        if (ref.current) {
            // Handle element being inside an iframe
            const _document = ref.current.ownerDocument;
            const _window = _document.defaultView || window;

            // Reset classes so we can re-calculate without any previous re-positioning affecting the calcs
            applyDefaultClasses();

            const bounding = ref.current.getBoundingClientRect();
            const outOfViewport = {
                top: bounding.top < 0,
                bottom: bounding.bottom > (_window.innerHeight || _document.documentElement.clientHeight),
                left: bounding.left < 0,
                right: bounding.right > (_window.innerWidth || _document.documentElement.clientWidth)
            };

            applyOutOfViewportClasses(outOfViewport);
        }
    }, [ref]);

    // Layout effect needed here to avoid flicker of the default position before
    // repositioning the element
    useLayoutEffect(() => {
        updateOutOfViewportClasses();
    }, [ref]);

    useEffect(() => {
        window.addEventListener('resize', updateOutOfViewportClasses);
        return () => {
            window.removeEventListener('resize', updateOutOfViewportClasses);
        };
    }, []);
}
