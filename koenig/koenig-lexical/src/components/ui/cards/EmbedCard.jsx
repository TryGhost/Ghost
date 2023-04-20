import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {UrlInput} from '../UrlInput';

export function EmbedCard({captionEditor, captionEditorInitialState, html, isSelected, urlInputValue, urlPlaceholder, urlError, isLoading, handleUrlChange, handleUrlSubmit, handleRetry, handlePasteAsLink, handleClose}) {
    if (html) {
        return (
            <>
                <EmbedIframe dataTestId="embed-iframe" html={html} />
                <CardCaptionEditor
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder="Type caption for embed (optional)"
                    dataTestId="embed-caption"
                    isSelected={isSelected}
                />
                <div className="absolute inset-0 z-50 mt-0"></div>
            </>
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

function EmbedIframe({dataTestId, html}) {
    const iframeRef = React.useRef(null);

    const handleResize = () => {
        // get ratio from nested iframe if present (eg, Vimeo)
        const firstElement = iframeRef.current.contentDocument.body.firstChild;
        
        // won't have an iframe if the embed is invalid or fetching
        if (!firstElement) {
            return;
        }

        if (firstElement.tagName === 'IFRAME') {
            const widthAttr = firstElement.getAttribute('width');

            if (widthAttr.indexOf('%') === -1) {
                const heightAttr = parseInt(firstElement.getAttribute('height'));
                if (widthAttr && heightAttr) {
                    const ratio = widthAttr / heightAttr;
                    const newHeight = iframeRef.current.offsetWidth / ratio;
                    firstElement.style.height = `${newHeight}px`;
                    iframeRef.current.style.height = `${newHeight}px`;
                    firstElement.style.width = '100%';
                    return;
                }
            }

            const heightAttr = firstElement.getAttribute('height');
            if (heightAttr.indexOf('%') === -1) {
                iframeRef.current.style.height = `${heightAttr}px`;
                return;
            }
        }

        // otherwise use iframes internal height (eg, Instagram)
        const scrollHeight = iframeRef.current.contentDocument.scrollingElement.scrollHeight;
        iframeRef.current.style.height = `${scrollHeight}px`;
    };
    
    const handleLoad = () => {
        const iframeBody = iframeRef.current.contentDocument.body;
        // apply styles
        iframeBody.style.display = 'flex';
        iframeBody.style.margin = '0';
        iframeBody.style.justifyContent = 'center';
        // resize first load
        handleResize();
    };

    // register listener for resize events
    React.useEffect(() => {
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(iframeRef.current);

        // cleanup listener when component unmounts
        return function cleanup() {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <iframe
            ref={iframeRef}
            className="bn miw-100 w-full"
            data-testid={dataTestId}
            srcDoc={html}
            title="embed-card-iframe"
            onLoad={handleLoad}>
        </iframe>
    );
}

EmbedCard.propTypes = {
    html: PropTypes.string
};
