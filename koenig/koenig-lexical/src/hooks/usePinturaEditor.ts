import trackEvent from '../utils/analytics';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {PinturaConfig} from '../context/KoenigComposerContext';

export type OpenImageEditor = (options: {image: string; handleSave: (blob: Blob) => void}) => void;

declare global {
    interface Window {
        pintura?: {
            openDefaultEditor: (options: Record<string, unknown>) => {
                on: (event: string, callback: (result: {dest: Blob}) => void) => void;
            };
        };
    }
}

export default function usePinturaEditor({
    config, disabled = false
}: {config?: PinturaConfig; disabled?: boolean}) {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [cssLoaded, setCssLoaded] = useState(false);
    const allowClose = useRef(false);

    const isEnabled = !disabled && scriptLoaded && cssLoaded;

    useEffect(() => {
        const jsUrl = config?.jsUrl;

        if (!jsUrl) {
            return;
        }

        if (window.pintura) {
            setScriptLoaded(true);
            return;
        }

        try {
            const url = new URL(jsUrl);
            const importUrl = `${url.protocol}//${url.host}${url.pathname}`;
            const importScriptPromise = import(/* @vite-ignore */ importUrl);

            importScriptPromise.then(() => {
                setScriptLoaded(true);
            }).catch(() => {
                // log script loading failure
            });
        } catch {
            // Log script loading error
        }
    }, [config?.jsUrl]);

    useEffect(() => {
        const cssUrl = config?.cssUrl;
        if (!cssUrl) {
            return;
        }

        try {
            // Check if the CSS file is already present in the document's head
            const cssLink = document.querySelector(`link[href="${cssUrl}"]`);
            if (cssLink) {
                setCssLoaded(true);
            } else {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = cssUrl;
                link.onload = () => {
                    setCssLoaded(true);
                };
                document.head.appendChild(link);
            }
        } catch {
            // Log css loading error
        }
    }, [config?.cssUrl]);

    const openEditor = useCallback<OpenImageEditor>(({image, handleSave}) => {
        allowClose.current = false;

        trackEvent('Image Edit Button Clicked', {location: 'editor'});
        if (image && isEnabled) {
            // add a timestamp to the image src to bypass cache
            // avoids cors issues with cached images
            const imageUrl = new URL(image);
            if (!imageUrl.searchParams.has('v')) {
                imageUrl.searchParams.set('v', String(Date.now()));
            }

            const imageSrc = imageUrl.href;
            const editor = window.pintura!.openDefaultEditor({
                src: imageSrc,
                enableTransparencyGrid: true,
                util: 'crop',
                utils: [
                    'crop',
                    'filter',
                    'finetune',
                    'redact',
                    'annotate',
                    'trim',
                    'frame',
                    'resize'
                ],
                frameOptions: [
                    // No frame
                    [undefined, (locale: Record<string, string>) => locale.labelNone],

                    // Sharp edge frame
                    ['solidSharp', (locale: Record<string, string>) => locale.frameLabelMatSharp],

                    // Rounded edge frame
                    ['solidRound', (locale: Record<string, string>) => locale.frameLabelMatRound],

                    // A single line frame
                    ['lineSingle', (locale: Record<string, string>) => locale.frameLabelLineSingle],

                    // A frame with cornenr hooks
                    ['hook', (locale: Record<string, string>) => locale.frameLabelCornerHooks],

                    // A polaroid frame
                    ['polaroid', (locale: Record<string, string>) => locale.frameLabelPolaroid]
                ],
                cropSelectPresetFilter: 'landscape',
                cropSelectPresetOptions: [
                    [undefined, 'Custom'],
                    [1, 'Square'],
                    // shown when cropSelectPresetFilter is set to 'landscape'
                    [2 / 1, '2:1'],
                    [3 / 2, '3:2'],
                    [4 / 3, '4:3'],
                    [16 / 10, '16:10'],
                    [16 / 9, '16:9'],
                    // shown when cropSelectPresetFilter is set to 'portrait'
                    [1 / 2, '1:2'],
                    [2 / 3, '2:3'],
                    [3 / 4, '3:4'],
                    [10 / 16, '10:16'],
                    [9 / 16, '9:16']
                ],
                locale: {
                    labelButtonExport: 'Save and close'
                },
                previewPad: true,
                willClose: () => (allowClose.current) // prevent closing on escape, only allow on close button clicks
            });

            editor.on('loaderror', () => {
                // TODO: log error message
            });

            editor.on('process', (result) => {
                // save edited image
                handleSave(result.dest);
                trackEvent('Image Edit Saved', {location: 'editor'});
            });
        }
    }, [isEnabled]);

    useEffect(() => {
        const handleCloseClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest('.PinturaModal button[title="Close"]')) {
                allowClose.current = true;
            }
        };

        window.addEventListener('click', handleCloseClick, {capture: true});

        return () => {
            window.removeEventListener('click', handleCloseClick);
        };
    }, []);

    return {
        isEnabled,
        openEditor
    };
}
