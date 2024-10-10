import IframeBuffering from '../../../../utils/IframeBuffering';
import React, {useCallback, useMemo} from 'react';

const getPreviewData = (announcementBackgroundColor?: string, announcementContent?: string, visibility?: string[]) => {
    const params = new URLSearchParams();
    params.append('announcement_bg', announcementBackgroundColor || 'accent');
    params.append('announcement', announcementContent || '');
    if (visibility && visibility.length > 0) {
        params.append('announcement_vis', visibility?.join(',') || '');
    }
    return params.toString();
};

type AnnouncementBarSettings = {
    announcementBackgroundColor?: string;
    announcementContent?: string;
    url: string;
    visibility?: string[];
};

const AnnouncementBarPreview: React.FC<AnnouncementBarSettings> = ({announcementBackgroundColor, announcementContent, url, visibility}) => {
    // Avoid re-rendering iframe if an equivalent array is initialised each render
    const visibilityMemo = useMemo(() => visibility, [visibility?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const injectContentIntoIframe = useCallback((iframe: HTMLIFrameElement) => {
        if (!url) {
            return;
        }

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': getPreviewData(
                    announcementBackgroundColor,
                    announcementContent,
                    visibilityMemo
                ),
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
                const originalCSS = stylesheet.innerHTML;
                stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

                // replace the iframe contents with the doctored preview html
                const doctype = htmlDoc.doctype ? new XMLSerializer().serializeToString(htmlDoc.doctype) : '';
                let finalDoc = doctype + htmlDoc.documentElement.outerHTML;

                // Send the data to the iframe's window using postMessage
                // Inject the received content into the iframe
                iframe.contentDocument?.open();
                iframe.contentDocument?.write(finalDoc);
                iframe.contentDocument?.close();
            })
            .catch(() => {
                // handle error in fetching data
            });
    }, [announcementBackgroundColor, announcementContent, url, visibilityMemo]);

    return (
        <IframeBuffering
            addDelay={true}
            className="absolute h-[110%] w-[110%] origin-top-left scale-[.90909] bg-white max-[1600px]:h-[130%] max-[1600px]:w-[130%] max-[1600px]:scale-[.76923]"
            generateContent={injectContentIntoIframe}
            height='100%'
            parentClassName="relative h-full w-full"
            testId='announcement-bar-preview-iframe'
            width='100%'
        />
    );
};

export default AnnouncementBarPreview;
