import IframeBuffering from '../../../../utils/IframeBuffering';
import React from 'react';

type EmbedSignupPreviewProps = {
    html: string;
    style: string;
};

const EmbedSignupPreview: React.FC<EmbedSignupPreviewProps> = ({html, style}) => {
    const generateContentForEmbed = (iframe: HTMLIFrameElement) => {
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
    return (
        <IframeBuffering
            className="absolute size-full overflow-hidden transition-opacity duration-500"
            generateContent={generateContentForEmbed}
            height="100%"
            parentClassName="relative h-full w-full"
            width="100%"
        />
    );
};

export default EmbedSignupPreview;
