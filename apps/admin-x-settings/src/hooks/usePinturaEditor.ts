import * as Sentry from '@sentry/react';
import {getSettingValues} from '../api/settings';
import {useCallback, useEffect, useState} from 'react';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

interface PinturaEditorConfig {
    jsUrl?: string;
    cssUrl?: string;
}

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
                stickerStickToImage: boolean;
                frameOptions: [FrameOptionType, (locale: PinturaLocale) => string][];
                cropSelectPresetFilter: string;
                cropSelectPresetOptions: [number | undefined, string][];
                locale: {
                    labelButtonExport: string;
                };
                previewPad: boolean;
            }) => {
                on: (event: string, callback: (result: { dest: File }) => void) => void;
            };
        }
    }
}

export default function usePinturaEditor({
    config
}: {
        config: PinturaEditorConfig;
    }) {
    const {config: globalConfig, settings} = useGlobalData();
    const [pintura] = getSettingValues<boolean>(settings, ['pintura']);
    const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
    const [cssLoaded, setCssLoaded] = useState<boolean>(false);

    let isEnabled = pintura && scriptLoaded && cssLoaded || false;

    useEffect(() => {
        const pinturaJsUrl = () => {
            if (globalConfig?.pintura?.js) {
                return globalConfig?.pintura?.js;
            }
            return config?.jsUrl || null;
        };
        let jsUrl = pinturaJsUrl();

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
    }, [config?.jsUrl, globalConfig?.pintura?.js]);

    useEffect(() => {
        const pinturaCssUrl = () => {
            if (globalConfig?.pintura?.css) {
                return globalConfig?.pintura?.css;
            }
            return config?.cssUrl;
        };
        let cssUrl = pinturaCssUrl();
        if (!cssUrl) {
            return;
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
    }, [config?.cssUrl, globalConfig?.pintura?.css]);

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
                        'sticker'
                    ],
                    stickerStickToImage: true,
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
                    previewPad: true
                });

                editor.on('loaderror', () => {
                    // TODO: log error message
                });

                editor.on('process', (result) => {
                    handleSave(result.dest);
                });
            }
        },
        [isEnabled]
    );

    return {
        isEnabled,
        openEditor
    };
}
