import React, {useEffect, useRef} from 'react';

export const injectCss = (data: string) => {
    const injectedCss = `html { pointer-events: none; }`;

    const domParser = new DOMParser();
    const htmlDoc = domParser.parseFromString(data, 'text/html');

    const stylesheet = htmlDoc.querySelector('style') as HTMLStyleElement;
    const originalCSS = stylesheet.innerHTML;
    stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

    // replace the iframe contents with the doctored preview html
    const doctype = htmlDoc.doctype ? new XMLSerializer().serializeToString(htmlDoc.doctype) : '';
    let finalDoc = doctype + htmlDoc.documentElement.outerHTML;

    return finalDoc;
};

type IframeBufferingProps = {
    url: string;
    dataModifier?: (data: string) => string;
    xPreview?: string;
};

const IframeBuffering: React.FC<IframeBufferingProps> = ({
    url,
    dataModifier,
    xPreview
}) => {
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

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': xPreview || '',
                Accept: 'text/plain',
                mode: 'cors',
                credentials: 'include'
            }
        })
            .then(response => response.text())
            .then((data) => {
                if (dataModifier) {
                    data = dataModifier(data);
                }

                const bufferIframe = bufferIframeRef.current;
                if (bufferIframe) {
                    bufferIframe.contentDocument?.open();
                    bufferIframe.contentDocument?.write(data);
                    bufferIframe.contentDocument?.close();
                    bufferIframe.onload = swapIframeContent;
                }
            })
            .catch(() => { /* handle error in fetching data */ });
    }, [url, dataModifier, xPreview]);

    return (
        <>
            <iframe ref={visibleIframeRef} height='100%' title='Visible Iframe' width='100%'></iframe>
            <iframe ref={bufferIframeRef} height='100%' style={{display: 'none'}} title='Buffer Iframe' width='100%'></iframe>
        </>
    );
};

export default IframeBuffering;
