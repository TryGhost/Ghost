import * as Sentry from '@sentry/react';
import {Config} from '@tryghost/admin-x-framework/api/config';
import {Setting, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

interface OpenEditorParams {
    image: string;
    handleSave: (dest: File) => void;
}

type FrameOptionType = 'solidSharp' | 'solidRound' | 'lineSingle' | 'hook' | 'polaroid' | undefined;
interface PinturaLocale {
    labelNone: string;
    frameLabelMatSharp: string;
    frameLabelMatRound: string;
    frameLabelLineSingle: string;
    frameLabelCornerHooks: string;
    frameLabelPolaroid: string;
    labelButtonExport: string;
}

declare global {
    interface Window {
        pintura: {
            openDefaultEditor: (params: {
                src: string;
                enableTransparencyGrid: boolean;
                util: string;
                utils: string[];
                frameOptions: [FrameOptionType, (locale: PinturaLocale) => string][];
                cropSelectPresetFilter: string;
                cropSelectPresetOptions: [number | undefined, string][];
                locale: {
                    labelButtonExport: string;
                };
                previewPad: boolean;
                willClose: () => boolean;
            }) => {
                on: (event: string, callback: (result: { dest: File }) => void) => void;
            };
        }
    }
}

export default function usePinturaEditor() {
    const {config: globalConfig, settings} = useGlobalData() as { config: Config, settings: Setting[] };
    const [pintura] = getSettingValues<boolean>(settings, ['pintura']);
    const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
    const [cssLoaded, setCssLoaded] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const allowClose = useRef<boolean>(false);
    const [pinturaJsUrl] = getSettingValues<string>(settings, ['pintura_js_url']);
    const [pinturaCssUrl] = getSettingValues<string>(settings, ['pintura_css_url']);

    let isEnabled = pintura && scriptLoaded && cssLoaded || false;
    const pinturaConfig = globalConfig?.pintura as { js?: string; css?: string };

    useEffect(() => {
        const jsPath = () => {
            if (pinturaConfig?.js) {
                return pinturaConfig?.js;
            }
            return pinturaJsUrl || null;
        };
        let jsUrl = jsPath();

        // load the script from admin root if relative
        if (!jsUrl) {
            return;
        }

        // load the script from admin root if relative
        if (jsUrl.startsWith('/')) {
            const {adminRoot} = getGhostPaths();
            jsUrl = window.location.origin + adminRoot.replace(/\/$/, '') + jsUrl;
        }

        if (window.pintura) {
            setScriptLoaded(true);
            return;
        }

        try {
            const url = new URL(jsUrl);
            const importUrl = `${url.protocol}//${url.host}${url.pathname}`;
            const importScriptPromise = import(/* @vite-ignore */ importUrl);
            importScriptPromise
                .then(() => {
                    setScriptLoaded(true);
                })
                .catch((e) => {
                    Sentry.captureException(e);
                });
        } catch (e) {
            Sentry.captureException(e);
            // Log script loading error
        }
    }, [pinturaJsUrl, pinturaConfig?.js]);

    useEffect(() => {
        const cssPath = () => {
            if (pinturaConfig?.css) {
                return pinturaConfig?.css;
            }
            return pinturaCssUrl || null;
        };
        let cssUrl = cssPath();
        if (!cssUrl) {
            return;
        }

        if (cssUrl.startsWith('/')) {
            const {adminRoot} = getGhostPaths();
            cssUrl = window.location.origin + adminRoot.replace(/\/$/, '') + cssUrl;
        }

        try {
            // Check if the CSS file is already present in the document's head
            let cssLink = document.querySelector(`link[href="${cssUrl}"]`);
            if (cssLink) {
                setCssLoaded(true);
            } else {
                let link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = cssUrl;
                link.onload = () => {
                    setCssLoaded(true);
                };
                document.head.appendChild(link);
            }
        } catch (e) {
            Sentry.captureException(e);
            // wire up to sentry
        }
    }, [pinturaCssUrl, pinturaConfig?.css]);

    const openEditor = useCallback(
        ({image, handleSave}: OpenEditorParams) => {
            if (image && isEnabled) {
                const imageUrl = new URL(image);
                if (!imageUrl.searchParams.has('v')) {
                    imageUrl.searchParams.set('v', Date.now().toString());
                }

                const imageSrc = imageUrl.href;

                const editor = window.pintura.openDefaultEditor({
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
                        [undefined, locale => locale.labelNone],

                        // Sharp edge frame
                        ['solidSharp', locale => locale.frameLabelMatSharp],

                        // Rounded edge frame
                        ['solidRound', locale => locale.frameLabelMatRound],

                        // A single line frame
                        ['lineSingle', locale => locale.frameLabelLineSingle],

                        // A frame with cornenr hooks
                        ['hook', locale => locale.frameLabelCornerHooks],

                        // A polaroid frame
                        ['polaroid', locale => locale.frameLabelPolaroid]
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
                    // Skip default Escape to close behaviour, only allow when the close button is clicked
                    willClose: () => {
                        if (allowClose.current) {
                            setIsOpen(false);
                            return true;
                        }

                        return false;
                    }
                });

                editor.on('loaderror', () => {
                    // TODO: log error message on Sentry
                    Sentry.captureMessage('Pintura editor failed to load');
                });

                editor.on('process', (result) => {
                    handleSave(result.dest);
                });

                setIsOpen(true);
            }
        },
        [isEnabled]
    );

    // Only allow closing the modal if the close button was clicked
    useEffect(() => {
        const handleEscapePress = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
            }
        };
        if (!isOpen) {
            return;
        }

        const handleCloseClick = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest('.PinturaModal button[title="Close"]')) {
                allowClose.current = true;
            }
        };

        window.addEventListener('click', handleCloseClick, {capture: true});
        window.addEventListener('keydown', handleEscapePress, {capture: true});

        return () => {
            window.removeEventListener('click', handleCloseClick, {capture: true});
            window.removeEventListener('keydown', handleEscapePress, {capture: true});
        };
    }, [isOpen]);

    return {
        isEnabled,
        openEditor
    };
}
