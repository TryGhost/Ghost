import React, {useEffect, useRef} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {CustomThemeSetting} from '../../../../types/api';

type BrandSettings = {
    description: string;
    accentColor: string;
    icon: string;
    logo: string;
    coverImage: string;
    themeSettings: Array<CustomThemeSetting & { dirty?: boolean }>;
}

interface ThemePreviewProps {
    settings: BrandSettings
}

function getApiUrl({siteUrl, path = ''}: {
    siteUrl: string;
    path?: string;
}): string {
    const url = new URL(siteUrl);
    const subdir = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    const fullPath = `${subdir}${path.replace(/^\//, '')}`;

    return `${url.origin}${fullPath}`;
}

function getPreviewData({
    description,
    accentColor,
    icon,
    logo,
    coverImage,
    themeSettings
}: {
    description: string;
    accentColor: string;
    icon: string;
    logo: string;
    coverImage: string;
    themeSettings: Array<CustomThemeSetting & { dirty?: boolean }>,
}): string {
    const params = new URLSearchParams();
    params.append('c', accentColor);
    params.append('d', description);
    params.append('icon', icon);
    params.append('logo', logo);
    params.append('cover', coverImage);
    const themeSettingsObj: {
        [key: string]: string;
    } = {};
    themeSettings.forEach((setting) => {
        themeSettingsObj[setting.key] = setting.value as string;
    });
    params.append('custom', JSON.stringify(themeSettingsObj));

    return params.toString();
}

const ThemePreview: React.FC<ThemePreviewProps> = ({settings}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const {siteData} = useSettingGroup();
    const apiEndpoint = getApiUrl({
        siteUrl: siteData?.url || '',
        path: ''
    });
    useEffect(() => {
        if (!apiEndpoint) {
            return;
        }

        // Fetch theme preview HTML
        fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': getPreviewData({
                    ...settings
                }),
                Accept: 'text/plain',
                mode: 'cors',
                credentials: 'include'
            }
        })
            .then(response => response.text())
            .then((data) => {
                // inject extra CSS to disable navigation and prevent clicks
                const injectedCss = `html { pointer-events: none; }`;

                const domParser = new DOMParser();
                const htmlDoc = domParser.parseFromString(data, 'text/html');

                const stylesheet = htmlDoc.querySelector('style') as HTMLStyleElement;
                const originalCSS = stylesheet.innerHTML;
                stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

                // replace the iframe contents with the doctored preview html
                const doctype = htmlDoc.doctype ? new XMLSerializer().serializeToString(htmlDoc.doctype) : '';
                let finalDoc = doctype + htmlDoc.documentElement.outerHTML;

                // Send the data to the iframe's window using postMessage
                // Inject the received content into the iframe
                const iframe = iframeRef.current;
                if (iframe) {
                    iframe.contentDocument?.open();
                    iframe.contentDocument?.write(finalDoc);
                    iframe.contentDocument?.close();
                }
            })
            .catch(() => {
                // handle error in fetching data
            });
    }, [apiEndpoint, settings]);
    return (
        <>
            <iframe
                ref={iframeRef} height="100%" title="Site Preview"
                width="100%"
            ></iframe>
        </>
    );
};

export default ThemePreview;