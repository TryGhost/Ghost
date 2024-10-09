import IframeBuffering from '../../../../utils/IframeBuffering';
import React, {useCallback} from 'react';
import {CustomThemeSetting, hiddenCustomThemeSettingValue} from '@tryghost/admin-x-framework/api/customThemeSettings';
import {isCustomThemeSettingVisible} from '../../../../utils/isCustomThemeSettingsVisible';

type GlobalSettings = {
    description: string;
    accentColor: string;
    icon: string;
    logo: string;
    coverImage: string;
    themeSettings?: Array<CustomThemeSetting & { dirty?: boolean }>;
    bodyFont: string;
    headingFont: string;
}

interface ThemePreviewProps {
    settings: GlobalSettings
    url: string
}

function getPreviewData({
    description,
    accentColor,
    icon,
    logo,
    coverImage,
    themeSettings,
    bodyFont,
    headingFont
}: {
    description: string;
    accentColor: string;
    icon: string;
    logo: string;
    coverImage: string;
    themeSettings?: Array<CustomThemeSetting & { dirty?: boolean }>;
    bodyFont: string;
    headingFont: string;
}) {
    // Don't render twice while theme settings are loading
    if (!themeSettings) {
        return;
    }
    const themeSettingsKeyValueObj = themeSettings.reduce((obj, {key, value}) => ({...obj, [key]: value}), {});

    const params = new URLSearchParams();
    params.append('c', accentColor);
    params.append('d', description);
    params.append('icon', icon);
    params.append('logo', logo);
    params.append('cover', coverImage);
    params.append('bf', bodyFont);
    params.append('hf', headingFont);
    const custom: {
        [key: string]: string | typeof hiddenCustomThemeSettingValue;
    } = {};
    themeSettings.forEach((setting) => {
        custom[setting.key] = isCustomThemeSettingVisible(setting, themeSettingsKeyValueObj) ? setting.value as string : hiddenCustomThemeSettingValue;
    });
    params.append('custom', JSON.stringify(custom));

    return params.toString();
}

const ThemePreview: React.FC<ThemePreviewProps> = ({settings,url}) => {
    const previewData = getPreviewData({...settings});

    const injectContentIntoIframe = useCallback((iframe: HTMLIFrameElement) => {
        if (!url || !previewData) {
            return;
        }

        // Fetch theme preview HTML
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': previewData,
                Accept: 'text/plain'
            },
            mode: 'cors',
            credentials: 'include'
        })
            .then(response => response.text())
            .then((data) => {
                // inject extra CSS to disable navigation and prevent clicks
                const injectedCss = `html { pointer-events: none; }`;

                const domParser = new DOMParser();
                const htmlDoc = domParser.parseFromString(data, 'text/html');

                const stylesheet = htmlDoc.querySelector('style') as HTMLStyleElement;
                const originalCSS = stylesheet?.innerHTML;
                if (originalCSS) {
                    stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;
                } else {
                    htmlDoc.head.innerHTML += `<style>${injectedCss}</style>`;
                }

                // replace the iframe contents with the doctored preview html
                const doctype = htmlDoc.doctype ? new XMLSerializer().serializeToString(htmlDoc.doctype) : '';
                let finalDoc = doctype + htmlDoc.documentElement.outerHTML;

                // Send the data to the iframe's window using postMessage
                // Inject the received content into the iframe
                iframe.contentDocument?.open();
                iframe.contentDocument?.write(finalDoc);
                iframe.contentDocument?.close();
            });
    }, [previewData, url]);

    return (
        <IframeBuffering
            addDelay={false}
            className="absolute h-[110%] w-[110%] origin-top-left scale-[.90909] bg-white max-[1600px]:h-[130%] max-[1600px]:w-[130%] max-[1600px]:scale-[.76923]"
            generateContent={injectContentIntoIframe}
            height='100%'
            parentClassName="relative h-full w-full"
            testId="theme-preview"
            width='100%'
        />
    );
};

export default ThemePreview;
