import IframeBuffering from '../../../../utils/IframeBuffering';
import React, {memo} from 'react';

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
    const injectContentIntoIframe = (iframe: HTMLIFrameElement) => {
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
                    visibility
                ),
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
                iframe.contentDocument?.open();
                iframe.contentDocument?.write(finalDoc);
                iframe.contentDocument?.close();
            })
            .catch(() => {
                // handle error in fetching data
            });
    };

    return (
        <IframeBuffering
            addDelay={true}
            className="absolute h-[110%] w-[110%] origin-top-left scale-[.90909] max-[1600px]:h-[130%] max-[1600px]:w-[130%] max-[1600px]:scale-[.76923]"
            generateContent={injectContentIntoIframe}
            height='100%'
            parentClassName="relative h-full w-full"
            testId='announcement-bar-preview-iframe'
            width='100%'
        />
    );
};

function arraysAreEqual(arr1: string[], arr2: string[]) {
    if (!arr1 || !arr2) {
        return arr1 === arr2;
    } // handles null or undefined values
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

export default memo(AnnouncementBarPreview, (prevProps, nextProps) => {
    // Check if announcementBackgroundColor changed
    if (prevProps.announcementBackgroundColor !== nextProps.announcementBackgroundColor) {
        return false;
    }

    // Check if announcementContent changed
    if (prevProps.announcementContent !== nextProps.announcementContent) {
        return false;
    }

    // Check if url changed
    if (prevProps.url !== nextProps.url) {
        return false;
    }

    // Check if visibility array changed in size or content
    if (!arraysAreEqual(prevProps.visibility || [], nextProps.visibility || [])) {
        return false;
    }

    // If we've reached this point, all props are the same
    return true;
});

