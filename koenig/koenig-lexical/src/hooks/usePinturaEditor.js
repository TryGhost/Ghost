import {useCallback, useEffect, useState} from 'react';

export default function usePinturaEditor({
    config, disabled = false
}) {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [cssLoaded, setCssLoaded] = useState(false);

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

            let importScriptPromise;

            if (url.protocol === 'http:') {
                importScriptPromise = import(`http://${url.host}${url.pathname}`);
            } else {
                importScriptPromise = import(`https://${url.host}${url.pathname}`);
            }

            importScriptPromise.then(() => {
                setScriptLoaded(true);
            }).catch(() => {
                // log script loading failure
            });
        } catch (e) {
            // Log script loading error
        }
    }, [config?.jsUrl]);

    useEffect(() => {
        let cssUrl = config?.cssUrl;
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
            // Log css loading error
        }
    }, [config?.cssUrl]);

    const openEditor = useCallback(({image, handleSave}) => {
        if (image && isEnabled) {
            // add a timestamp to the image src to bypass cache
            // avoids cors issues with cached images
            const imageUrl = new URL(image);
            if (!imageUrl.searchParams.has('v')) {
                imageUrl.searchParams.set('v', Date.now());
            }

            const imageSrc = imageUrl.href;
            const editor = window.pintura.openDefaultEditor({
                src: imageSrc,
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
                }
            });

            editor.on('loaderror', () => {
                // TODO: log error message
            });

            editor.on('process', (result) => {
                // save edited image
                handleSave(result.dest);
            });
        }
    }, [isEnabled]);

    return {
        isEnabled,
        openEditor
    };
}
