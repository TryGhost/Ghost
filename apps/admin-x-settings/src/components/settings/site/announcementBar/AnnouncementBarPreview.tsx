import React, {useEffect, useRef} from 'react';

const getPreviewData = (announcementBackgroundColor?:string, announcementContext?: string) => {
    const params = new URLSearchParams();
    params.append('announcement_bg', announcementBackgroundColor || 'accent');
    params.append('announcement', announcementContext || '');
    params.append('announcement_vis', 'visitors, free_members, paid_members');
    return params.toString();
};

type AnnouncementBarSettings = {
    announcementBackgroundColor?: string;
    announcementContent?: string;
    homepageUrl: string;
};

const AnnouncementBarPreview: React.FC<AnnouncementBarSettings> = ({announcementBackgroundColor, announcementContent, homepageUrl}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!homepageUrl) {
            return;
        }

        // Fetch theme preview HTML
        fetch(homepageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': getPreviewData(
                    announcementBackgroundColor,
                    announcementContent
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
    }, [announcementBackgroundColor, announcementContent, homepageUrl]);

    return (
        <>
            <iframe
                ref={iframeRef}
                data-testid='announcement-bar-preview'
                height='100%'
                title='Announcement Bar Preview'
                width='100%'
            >
            </iframe>
        </>
    );
};

export default AnnouncementBarPreview;