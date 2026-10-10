import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {
    EMBED_READY_MESSAGE,
    EMBED_RENDERER_PERMISSIONS,
    EMBED_RENDERER_TIMEOUT,
    EMBED_RENDERER_VERSION,
    EMBED_RENDER_MESSAGE,
    EMBED_RESIZE_MESSAGE,
    resolveEmbedHeight
} from '../../../utils/embed-renderer';
import {UrlInput} from '../UrlInput';

export function EmbedCard({captionEditor, captionEditorInitialState, html, isSelected, rendererUrl, url, urlInputValue, urlPlaceholder, urlError, isLoading, handleUrlChange, handleUrlSubmit, handleRetry, handlePasteAsLink, handleClose}) {
    if (html) {
        return (
            <div>
                <div className="not-kg-prose relative">
                    {rendererUrl === undefined ? (
                        <EmbedIframe dataTestId="embed-iframe" html={html} />
                    ) : (
                        <RendererEmbedIframe
                            // remount for new content so each render gets a fresh renderer and handshake
                            key={`${rendererUrl}\n${html}`}
                            dataTestId="embed-iframe"
                            html={html}
                            rendererUrl={rendererUrl}
                            url={url}
                        />
                    )}
                    <div className="absolute inset-0 z-50 mt-0"></div>
                </div>
                <CardCaptionEditor
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder="Type caption for embed (optional)"
                    dataTestId="embed-caption"
                    isSelected={isSelected}
                />
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

function EmbedIframe({dataTestId, html}) {
    const iframeRef = React.useRef(null);

    const handleResize = () => {
        // get ratio from nested iframe if present (eg, Vimeo)
        const firstElement = iframeRef.current?.contentDocument?.body?.firstChild;

        // won't have an iframe if the embed is invalid or fetching
        if (!firstElement) {
            return;
        }

        if (firstElement.tagName === 'IFRAME') {
            const widthAttr = firstElement.getAttribute('width');
            const heightAttr = firstElement.getAttribute('height');

            if (widthAttr && heightAttr && widthAttr.indexOf('%') === -1 && heightAttr.indexOf('%') === -1) {
                const ratio = parseInt(widthAttr) / parseInt(heightAttr);
                const newHeight = iframeRef.current.offsetWidth / ratio;
                firstElement.style.height = `${newHeight}px`;
                iframeRef.current.style.height = `${newHeight}px`;
                firstElement.style.width = '100%';
                return;
            }

            if (heightAttr && heightAttr.indexOf('%') === -1) {
                iframeRef.current.style.height = `${heightAttr}px`;
                return;
            }
        }

        // otherwise use iframes internal height (eg, Instagram)
        const scrollHeight = iframeRef.current?.contentDocument?.scrollingElement?.scrollHeight;

        if (!scrollHeight) {
            return;
        }

        iframeRef.current.style.height = `${scrollHeight}px`;
    };

    // register mutation observer to handle changes to iframe content (e.g. twitter embeds loading richer content)
    const config = {
        attributes: true,
        attributeOldValue: false,
        characterData: true,
        characterDataOldValue: false,
        childList: true,
        subtree: true
    };
    const mutationObserver = new MutationObserver(handleResize);

    const handleLoad = () => {
        const iframeBody = iframeRef.current.contentDocument.body;
        // apply styles
        iframeBody.style.display = 'flex';
        iframeBody.style.margin = '0';
        iframeBody.style.justifyContent = 'center';
        // resize first load
        handleResize();
        // start listening to mutations when the iframe content is loaded
        mutationObserver.observe(iframeRef.current.contentWindow.document, config);
    };

    // register listener for window resize events
    React.useEffect(() => {
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(iframeRef.current);

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

// Previews embed html in the embed renderer, which runs on a separate origin
// so embed scripts can't reach the editor. Fails closed when the renderer is
// unusable or doesn't answer in time, but still renders a late answer.
function RendererEmbedIframe({dataTestId, html, rendererUrl, url}) {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [unavailable, setUnavailable] = React.useState(!rendererUrl);
    const [timedOut, setTimedOut] = React.useState(false);
    const {onError} = React.useContext(KoenigComposerContext);
    const loadedRef = React.useRef(false);

    // reports to the host, so a preview that fails to load can be debugged
    const report = (reason: string) => {
        onError?.(new Error(`Embed renderer unavailable: ${reason}`));
    };

    // reported too, so timeouts that recovered can be told apart from real failures
    const reportLate = (ms: number, loadedAtTimeout: boolean) => {
        onError?.(new Error(`Embed renderer answered late: ${(ms / 1000).toFixed(1)}s (frame ${loadedAtTimeout ? 'loaded' : 'never loaded'} at timeout)`));
    };

    const fail = (reason: string) => {
        setUnavailable(true);
        report(reason);
    };

    // a layout effect listens before the iframe can run, so a cached renderer's ready message isn't missed
    React.useLayoutEffect(() => {
        if (!rendererUrl) {
            fail('invalid url');
            return;
        }

        const rendererOrigin = new URL(rendererUrl).origin;
        const startedAt = performance.now();
        let rendered = false;
        // whether the frame had loaded when the timeout ran, or null before then
        let loadedAtTimeout: boolean | null = null;

        const handleMessage = (event: MessageEvent) => {
            const iframe = iframeRef.current;

            if (!iframe || event.source !== iframe.contentWindow || event.origin !== rendererOrigin) {
                return;
            }

            if (event.data?.type === EMBED_READY_MESSAGE && !rendered) {
                if (event.data.version !== EMBED_RENDERER_VERSION) {
                    // the effect isn't cleaned up on failure, so stop the timeout reporting again
                    window.clearTimeout(timeout);
                    fail(`renderer is v${event.data.version}, editor is v${EMBED_RENDERER_VERSION}`);
                    return;
                }

                rendered = true;
                if (loadedAtTimeout !== null) {
                    setTimedOut(false);
                    reportLate(performance.now() - startedAt, loadedAtTimeout);
                }
                iframe.contentWindow.postMessage({type: EMBED_RENDER_MESSAGE, version: EMBED_RENDERER_VERSION, html}, rendererOrigin);
                return;
            }

            if (event.data?.type === EMBED_RESIZE_MESSAGE) {
                const height = resolveEmbedHeight(event.data.height);

                if (height !== null) {
                    iframe.style.height = `${height}px`;
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // the renderer can be blocked, offline or misconfigured, but a busy
        // editor can also handle its answer late, so the frame keeps loading
        const timeout = window.setTimeout(() => {
            if (!rendered) {
                setTimedOut(true);
                loadedAtTimeout = loadedRef.current;
                // the frame loads for error pages too, so loaded means the wrong document came back
                report(`timed out, frame ${loadedAtTimeout ? 'loaded' : 'never loaded'}`);
            }
        }, EMBED_RENDERER_TIMEOUT);

        return function cleanup() {
            window.removeEventListener('message', handleMessage);
            window.clearTimeout(timeout);
        };
        // `fail`, `report` and `reportLate` are recreated every render and mustn't restart the handshake
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [html, rendererUrl]);

    if (unavailable) {
        return <EmbedPreviewUnavailable url={url} />;
    }

    return (
        <>
            {timedOut && <EmbedPreviewUnavailable url={url} />}
            <iframe
                ref={iframeRef}
                className={timedOut ? 'hidden' : 'bn miw-100 w-full'}
                data-testid={dataTestId}
                referrerPolicy="no-referrer"
                sandbox={EMBED_RENDERER_PERMISSIONS}
                src={rendererUrl}
                tabIndex={-1}
                title="embed-card-iframe"
                onLoad={() => {
                    loadedRef.current = true;
                }}>
            </iframe>
        </>
    );
}

function EmbedPreviewUnavailable({url}) {
    return (
        <div className="flex min-h-[120px] w-full flex-col items-center justify-center gap-1 rounded border border-grey-200 p-4 text-center font-sans text-sm text-grey-700 dark:border-grey-900 dark:text-grey-500" data-testid="embed-preview-unavailable">
            <span>Embed preview unavailable</span>
            {url && <span className="break-all text-xs text-grey-500">{url}</span>}
        </div>
    );
}

EmbedCard.propTypes = {
    html: PropTypes.string,
    rendererUrl: PropTypes.string,
    url: PropTypes.string,
    isSelected: PropTypes.bool,
    urlInputValue: PropTypes.string,
    urlPlaceholder: PropTypes.string,
    urlError: PropTypes.bool,
    isLoading: PropTypes.bool,
    handleUrlChange: PropTypes.func,
    handleUrlSubmit: PropTypes.func,
    handleRetry: PropTypes.func,
    handlePasteAsLink: PropTypes.func,
    handleClose: PropTypes.func,
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.object
};

EmbedIframe.propTypes = {
    dataTestId: PropTypes.string,
    html: PropTypes.string
};

RendererEmbedIframe.propTypes = {
    dataTestId: PropTypes.string,
    html: PropTypes.string,
    rendererUrl: PropTypes.string,
    url: PropTypes.string
};

EmbedPreviewUnavailable.propTypes = {
    url: PropTypes.string
};
