import IframeBuffering from '@/settings/app/utils/iframe-buffering';
import React, {useCallback, useRef} from 'react';
import {type EmbedSignupLayout, getEmbedPreviewLayoutMarker} from '@/settings/app/utils/generate-embed-code';

type EmbedSignupPreviewProps = {
    backgroundColor: string;
    html: string;
    style: EmbedSignupLayout;
};

const EmbedSignupPreview: React.FC<EmbedSignupPreviewProps> = ({backgroundColor, html, style}) => {
    const backgroundColorRef = useRef(backgroundColor);
    const htmlRef = useRef(html);
    const hasMatchingLayout = html.includes(getEmbedPreviewLayoutMarker(style));
    backgroundColorRef.current = backgroundColor;
    htmlRef.current = html;

    const generateContentForEmbed = useCallback((iframe: HTMLIFrameElement) => {
        if (!hasMatchingLayout) {
            return;
        }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            return;
        }

        iframe.dataset.previewLayout = style;

        const docString = `
            <html>
                <head>
                    <style>body, html {height: 100%; padding: 0; margin: 0; overflow: hidden; background: ${backgroundColorRef.current}; transition: background-color 200ms ease;}</style>
                </head>
                <body>${htmlRef.current}</body>
            </html>
        `;

        iframeDoc.open();
        iframeDoc.write(docString);
        iframeDoc.close();
    // Layout state updates before its generated markup. Wait until they match
    // so the buffer never builds a Minimal form inside the Branded container.
    // Subsequent option changes can safely update the mounted form in place.
    }, [hasMatchingLayout, style]);

    const updateContentForEmbed = useCallback((iframe: HTMLIFrameElement) => {
        // Structural layout changes are handled by the buffered generator. Do
        // not apply their attributes to the still-visible previous layout.
        if (iframe.dataset.previewLayout !== style) {
            return;
        }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            return;
        }

        [iframeDoc.documentElement, iframeDoc.body].forEach((element) => {
            element.style.backgroundColor = backgroundColor;
            element.style.transition = 'background-color 200ms ease';
        });

        const sourceDoc = new DOMParser().parseFromString(html, 'text/html');
        const sourceScript = sourceDoc.querySelector('script');
        const targetScript = iframeDoc.querySelector('script');
        if (!sourceScript || !targetScript) {
            return;
        }

        // Signup form observes data attribute mutations, so preview options can
        // update without remounting the form or fading the entire iframe.
        const nextAttributes = new Map(
            Array.from(sourceScript.attributes)
                .filter(attribute => attribute.name.startsWith('data-'))
                .map(attribute => [attribute.name, attribute.value])
        );

        Array.from(targetScript.attributes)
            .filter(attribute => attribute.name.startsWith('data-') && !nextAttributes.has(attribute.name))
            .forEach(attribute => targetScript.removeAttribute(attribute.name));

        nextAttributes.forEach((value, name) => {
            if (targetScript.getAttribute(name) !== value) {
                targetScript.setAttribute(name, value);
            }
        });
    }, [backgroundColor, html, style]);

    return (
        <IframeBuffering
            className="absolute size-full overflow-hidden transition-opacity duration-500"
            generateContent={generateContentForEmbed}
            height="100%"
            parentClassName="relative h-full min-h-[400px] w-full"
            updateContent={updateContentForEmbed}
            width="100%"
        />
    );
};

export default EmbedSignupPreview;
