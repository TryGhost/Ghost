import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {UrlInput} from '../UrlInput';
import type {LexicalEditor} from 'lexical';

interface EmbedCardProps {
    captionEditor?: LexicalEditor;
    captionEditorInitialState?: string;
    html?: string;
    isSelected?: boolean;
    urlInputValue?: string;
    urlPlaceholder?: string;
    urlError?: boolean;
    isLoading?: boolean;
    handleUrlChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleUrlSubmit: (e: KeyboardEvent | React.KeyboardEvent) => void;
    handleRetry?: () => void;
    handlePasteAsLink?: (value?: string) => void;
    handleClose?: () => void;
}

export function EmbedCard({captionEditor, captionEditorInitialState, html, isSelected, urlInputValue, urlPlaceholder, urlError, isLoading, handleUrlChange, handleUrlSubmit, handleRetry, handlePasteAsLink, handleClose}: EmbedCardProps) {
    if (html) {
        return (
            <div>
                <div className="not-kg-prose relative">
                    <EmbedIframe dataTestId="embed-iframe" html={html} />
                    <div className="absolute inset-0 z-50 mt-0"></div>
                </div>
                {captionEditor && (
                    <CardCaptionEditor
                        captionEditor={captionEditor}
                        captionEditorInitialState={captionEditorInitialState}
                        captionPlaceholder="Type caption for embed (optional)"
                        dataTestId="embed-caption"
                        isSelected={isSelected}
                    />
                )}
            </div>
        );
    }
    return (
        <UrlInput
            dataTestId="embed-url"
            handleClose={handleClose}
            handlePasteAsLink={handlePasteAsLink}
            handleRetry={handleRetry}
            handleUrlChange={handleUrlChange}
            handleUrlSubmit={handleUrlSubmit}
            hasError={urlError}
            isLoading={isLoading}
            placeholder={urlPlaceholder}
            value={urlInputValue}
        />
    );
}

interface EmbedIframeProps {
    dataTestId?: string;
    html: string;
}

function EmbedIframe({dataTestId, html}: EmbedIframeProps) {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const handleResize = () => {
        // get ratio from nested iframe if present (eg, Vimeo)
        const firstElement = iframeRef.current?.contentDocument?.body?.firstChild as HTMLElement | null;

        // won't have an iframe if the embed is invalid or fetching
        if (!firstElement) {
            return;
        }

        if (firstElement.tagName === 'IFRAME') {
            const iframeElement = firstElement as HTMLIFrameElement;
            const widthAttr = iframeElement.getAttribute('width');
            const heightAttr = iframeElement.getAttribute('height');

            if (widthAttr && heightAttr && widthAttr.indexOf('%') === -1 && heightAttr.indexOf('%') === -1) {
                const ratio = parseInt(widthAttr) / parseInt(heightAttr);
                const newHeight = iframeRef.current!.offsetWidth / ratio;
                iframeElement.style.height = `${newHeight}px`;
                iframeRef.current!.style.height = `${newHeight}px`;
                iframeElement.style.width = '100%';
                return;
            }

            if (heightAttr && heightAttr.indexOf('%') === -1) {
                iframeRef.current!.style.height = `${heightAttr}px`;
                return;
            }
        }

        // otherwise use iframes internal height (eg, Instagram)
        const scrollHeight = iframeRef.current?.contentDocument?.scrollingElement?.scrollHeight;

        if (!scrollHeight) {
            return;
        }

        iframeRef.current!.style.height = `${scrollHeight}px`;
    };

    // register mutation observer to handle changes to iframe content (e.g. twitter embeds loading richer content)
    const config: MutationObserverInit = {
        attributes: true,
        attributeOldValue: false,
        characterData: true,
        characterDataOldValue: false,
        childList: true,
        subtree: true
    };
    const mutationObserver = new MutationObserver(handleResize);

    const handleLoad = () => {
        const iframeBody = iframeRef.current!.contentDocument!.body;
        // apply styles
        iframeBody.style.display = 'flex';
        iframeBody.style.margin = '0';
        iframeBody.style.justifyContent = 'center';
        // resize first load
        handleResize();
        // start listening to mutations when the iframe content is loaded
        mutationObserver.observe(iframeRef.current!.contentWindow!.document, config);
    };

    // register listener for window resize events
    React.useEffect(() => {
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(iframeRef.current!);

        // cleanup listener when component unmounts
        return function cleanup() {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
        // mutationObserver is recreated every render; the cleanup only needs
        // the instance from the mount render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <iframe
            ref={iframeRef}
            className="bn miw-100 w-full"
            data-testid={dataTestId}
            srcDoc={html}
            tabIndex={-1}
            title="embed-card-iframe"
            onLoad={handleLoad}>
        </iframe>
    );
}
