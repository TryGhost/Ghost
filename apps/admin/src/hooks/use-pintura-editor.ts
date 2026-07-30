import {usePinturaConfig} from '@tryghost/admin-x-framework/hooks';
import {trackEvent} from '@tryghost/admin-x-framework';
import {useCallback, useEffect, useRef, useState} from 'react';

interface OpenEditorParams {
    image: string;
    handleSave: (file: File) => void | boolean | Promise<void | boolean>;
}

/** Loads Ghost's configured Pintura editor and exposes the legacy image-edit action. */
export function usePinturaEditor({disabled = false}: {disabled?: boolean} = {}) {
    const config = usePinturaConfig();
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [cssLoaded, setCssLoaded] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const allowClose = useRef(false);
    const editorRef = useRef<{destroy: () => void} | null>(null);

    useEffect(() => {
        const jsUrl = config?.jsUrl;
        if (!jsUrl) {
            return;
        }

        if (window.pintura) {
            setScriptLoaded(true);
            return;
        }

        const importScript = async () => {
            try {
                const url = new URL(jsUrl);
                await import(/* @vite-ignore */ `${url.protocol}//${url.host}${url.pathname}`);
                setScriptLoaded(true);
            } catch {
                // The edit action stays hidden when the optional editor fails to load.
            }
        };
        void importScript();
    }, [config?.jsUrl]);

    useEffect(() => {
        const cssUrl = config?.cssUrl;
        if (!cssUrl) {
            return;
        }

        const existingLink = document.querySelector(`link[href="${cssUrl}"]`);
        if (existingLink) {
            setCssLoaded(true);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssUrl;
        link.onload = () => setCssLoaded(true);
        document.head.appendChild(link);
    }, [config?.cssUrl]);

    const isEnabled = !disabled && !!config && scriptLoaded && cssLoaded;
    const openEditor = useCallback(({image, handleSave}: OpenEditorParams) => {
        const pintura = window.pintura;
        if (!image || !isEnabled || !pintura || editorRef.current) {
            return;
        }

        allowClose.current = false;
        const imageUrl = new URL(image, window.location.origin);
        if (!imageUrl.searchParams.has('v')) {
            imageUrl.searchParams.set('v', Date.now().toString());
        }

        trackEvent('Image Edit Button Clicked', {location: 'admin'});
        const editor = pintura.openDefaultEditor({
            src: imageUrl.href,
            enableTransparencyGrid: true,
            util: 'crop',
            utils: ['crop', 'filter', 'finetune', 'redact', 'annotate', 'trim', 'frame', 'resize'],
            frameOptions: [
                [undefined, locale => locale.labelNone],
                ['solidSharp', locale => locale.frameLabelMatSharp],
                ['solidRound', locale => locale.frameLabelMatRound],
                ['lineSingle', locale => locale.frameLabelLineSingle],
                ['hook', locale => locale.frameLabelCornerHooks],
                ['polaroid', locale => locale.frameLabelPolaroid]
            ],
            cropSelectPresetFilter: 'landscape',
            cropSelectPresetOptions: [
                [undefined, 'Custom'], [1, 'Square'], [2 / 1, '2:1'], [3 / 2, '3:2'], [4 / 3, '4:3'], [16 / 10, '16:10'], [16 / 9, '16:9'],
                [1 / 2, '1:2'], [2 / 3, '2:3'], [3 / 4, '3:4'], [10 / 16, '10:16'], [9 / 16, '9:16']
            ],
            locale: {labelButtonExport: 'Save and close'},
            previewPad: true,
            willClose: () => {
                if (allowClose.current) {
                    editorRef.current = null;
                    setIsOpen(false);
                    return true;
                }
                return false;
            }
        });
        editorRef.current = editor;
        editor.on('process', (result) => {
            void Promise.resolve().then(() => handleSave(result.dest)).then((saved) => {
                if (saved !== false) {
                    trackEvent('Image Edit Saved', {location: 'admin'});
                }
            }).catch(() => {});
        });
        editor.on('destroy', () => {
            if (editorRef.current === editor) {
                editorRef.current = null;
                setIsOpen(false);
            }
        });
        setIsOpen(true);
    }, [isEnabled]);

    useEffect(() => {
        if (!isEnabled && editorRef.current) {
            const editor = editorRef.current;
            editorRef.current = null;
            editor.destroy();
            setIsOpen(false);
        }
    }, [isEnabled]);

    useEffect(() => () => {
        const editor = editorRef.current;
        editorRef.current = null;
        editor?.destroy();
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleCloseClick = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest('.PinturaModal button[title="Close"]')) {
                allowClose.current = true;
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
            }
        };
        window.addEventListener('click', handleCloseClick, {capture: true});
        window.addEventListener('keydown', handleEscape, {capture: true});
        return () => {
            window.removeEventListener('click', handleCloseClick, {capture: true});
            window.removeEventListener('keydown', handleEscape, {capture: true});
        };
    }, [isOpen]);

    return {isEnabled, isOpen, openEditor};
}
