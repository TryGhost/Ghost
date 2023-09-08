import React, {useEffect, useRef, useState} from 'react';

type EmbedSignupPreviewProps = {
    html: string;
    style: string;
};

const EmbedSignupPreview: React.FC<EmbedSignupPreviewProps> = ({html, style}) => {
    const [visibleIframeIndex, setVisibleIframeIndex] = useState(0);
    const iframes = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)];

    const updateIframeContent = (index: number) => {
        const iframe = iframes[index].current;

        if (!iframe) {
            return;
        }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            return;
        }

        const docString = `
            <html>
                <head>
                    <style>body, html {padding: 0; margin: 0; overflow: hidden;}</style>
                    <style>${style}</style>
                </head>
                <body>${html}</body>
            </html>
        `;

        iframeDoc.open();
        iframeDoc.write(docString);
        iframeDoc.close();
    };

    useEffect(() => {
        const invisibleIframeIndex = visibleIframeIndex === 0 ? 1 : 0;
        updateIframeContent(invisibleIframeIndex);

        const timer = setTimeout(() => {
            setVisibleIframeIndex(invisibleIframeIndex);
        }, 100);

        return () => {
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [html, style]);

    return (
        <div className="relative">
            <iframe
                ref={iframes[0]}
                // allowTransparency={true}
                className={`absolute h-full w-full transition-opacity duration-500 ${visibleIframeIndex !== 0 ? 'z-10 opacity-0' : 'z-20 opacity-100'}`}
                frameBorder="0"
                title="Signup Form Preview 1"
            ></iframe>

            <iframe
                ref={iframes[1]}
                // allowTransparency={true}
                className={`absolute h-full w-full transition-opacity duration-500 ${visibleIframeIndex !== 1 ? 'z-10 opacity-0' : 'z-20 opacity-100'}`}
                frameBorder="0"
                title="Signup Form Preview 2"
            ></iframe>
        </div>
    );
};

export default EmbedSignupPreview;
