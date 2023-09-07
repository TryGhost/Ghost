import React, {useEffect, useRef} from 'react';

const getPreviewData = (announcementBackgroundColor?: string, announcementContent?: string) => {
    const params = new URLSearchParams();
    params.append('announcement_bg', announcementBackgroundColor || 'accent');
    params.append('announcement', announcementContent || '');
    params.append('announcement_vis', 'paid_members');
    return params.toString();
};

type AnnouncementBarSettings = {
    announcementBackgroundColor?: string;
    announcementContent?: string;
    url: string;
};

const AnnouncementBarPreview: React.FC<AnnouncementBarSettings> = ({announcementBackgroundColor, announcementContent, url}) => {
    const visibleIframeRef = useRef<HTMLIFrameElement>(null);
    const bufferIframeRef = useRef<HTMLIFrameElement>(null);

    const swapIframeContent = () => {
        if (visibleIframeRef.current && bufferIframeRef.current) {
            const tmpDoc = visibleIframeRef.current.contentDocument?.documentElement.innerHTML;
            visibleIframeRef.current.contentDocument?.open();
            visibleIframeRef.current.contentDocument?.write(bufferIframeRef.current.contentDocument?.documentElement.innerHTML || '');
            visibleIframeRef.current.contentDocument?.close();
            bufferIframeRef.current.contentDocument?.open();
            bufferIframeRef.current.contentDocument?.write(tmpDoc || '');
            bufferIframeRef.current.contentDocument?.close();
        }
    };

    useEffect(() => {
        if (!url) {
            return;
        }

        // Fetch theme preview HTML
        fetch(url, {
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

                // Inject the received content into the buffer iframe
                const bufferIframe = bufferIframeRef.current;
                if (bufferIframe) {
                    bufferIframe.contentDocument?.open();
                    bufferIframe.contentDocument?.write(finalDoc);
                    bufferIframe.contentDocument?.close();

                    // Once the buffer iframe loads the content, swap it with the visible iframe
                    bufferIframe.onload = swapIframeContent;
                }
            })
            .catch(() => {
            // handle error in fetching data
            });
    }, [announcementBackgroundColor, announcementContent, url]);

    return (
        <>
            <iframe
                ref={visibleIframeRef}
                data-testid='announcement-bar-preview'
                height='100%'
                title='Announcement Bar Preview'
                width='100%'
            ></iframe>
            <iframe
                ref={bufferIframeRef}
                height='100%'
                style={{display: 'none'}} // hide the buffer iframe
                title='Buffer Iframe'
                width='100%'
            ></iframe>
        </>
    );
};

export default AnnouncementBarPreview;
