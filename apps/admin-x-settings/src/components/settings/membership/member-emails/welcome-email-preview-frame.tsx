import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Hint, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade/utils';
import type {WelcomeEmailPreviewFrameState} from '../../../../hooks/use-welcome-email-preview';

interface WelcomeEmailPreviewFrameProps {
    previewState: WelcomeEmailPreviewFrameState;
}

const WelcomeEmailPreviewFrame: React.FC<WelcomeEmailPreviewFrameProps> = ({previewState}) => {
    const [previewHeight, setPreviewHeight] = useState<number | null>(null);
    const [isPreviewReady, setIsPreviewReady] = useState(false);
    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    const previewResizeObserverRef = useRef<ResizeObserver | null>(null);
    const previewMeasureFrameRef = useRef<number | null>(null);
    const previewRevealFrameRef = useRef<number | null>(null);

    const cleanupPreviewMeasurement = useCallback(() => {
        previewResizeObserverRef.current?.disconnect();
        previewResizeObserverRef.current = null;

        if (previewMeasureFrameRef.current !== null) {
            window.cancelAnimationFrame(previewMeasureFrameRef.current);
            previewMeasureFrameRef.current = null;
        }

        if (previewRevealFrameRef.current !== null) {
            window.cancelAnimationFrame(previewRevealFrameRef.current);
            previewRevealFrameRef.current = null;
        }
    }, []);

    const previewHtml = previewState.status === 'success' ? previewState.html : '';

    useEffect(() => {
        cleanupPreviewMeasurement();
        setIsPreviewReady(false);
        setPreviewHeight(null);
    }, [cleanupPreviewMeasurement, previewHtml, previewState.status]);

    useEffect(() => cleanupPreviewMeasurement, [cleanupPreviewMeasurement]);

    const syncPreviewHeight = useCallback(() => {
        const iframe = previewIframeRef.current;
        const doc = iframe?.contentDocument;

        if (!iframe || !doc) {
            return;
        }

        doc.documentElement.style.overflowY = 'hidden';
        doc.body.style.overflowY = 'hidden';

        const nextHeight = Math.max(
            doc.documentElement?.scrollHeight || 0,
            doc.body?.scrollHeight || 0,
            doc.documentElement?.offsetHeight || 0,
            doc.body?.offsetHeight || 0
        );

        if (nextHeight > 0) {
            setPreviewHeight(previousHeight => (previousHeight === nextHeight ? previousHeight : nextHeight));

            if (!isPreviewReady && previewRevealFrameRef.current === null) {
                previewRevealFrameRef.current = window.requestAnimationFrame(() => {
                    previewRevealFrameRef.current = window.requestAnimationFrame(() => {
                        previewRevealFrameRef.current = null;
                        setIsPreviewReady(true);
                    });
                });
            }
        }
    }, [isPreviewReady]);

    const queuePreviewHeightSync = useCallback(() => {
        if (previewMeasureFrameRef.current !== null) {
            window.cancelAnimationFrame(previewMeasureFrameRef.current);
        }

        previewMeasureFrameRef.current = window.requestAnimationFrame(() => {
            previewMeasureFrameRef.current = null;
            syncPreviewHeight();
        });
    }, [syncPreviewHeight]);

    const handlePreviewLoad = useCallback(() => {
        const iframe = previewIframeRef.current;
        const doc = iframe?.contentDocument;

        if (!iframe || !doc) {
            return;
        }

        cleanupPreviewMeasurement();
        queuePreviewHeightSync();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => {
                queuePreviewHeightSync();
            });

            observer.observe(doc.documentElement);
            observer.observe(doc.body);
            previewResizeObserverRef.current = observer;
        }
    }, [cleanupPreviewMeasurement, queuePreviewHeightSync]);

    const showPreviewLoading = previewState.status === 'loading' || (previewState.status === 'success' && !isPreviewReady);

    return (
        <div className='relative mx-auto w-full max-w-[740px] py-6' data-testid='welcome-email-preview'>
            {showPreviewLoading && (
                <div
                    className='flex min-h-full items-start justify-center pt-24'
                    data-testid='welcome-email-preview-loading'
                    style={previewHeight ? {height: `${previewHeight}px`} : undefined}
                >
                    <LoadingIndicator />
                </div>
            )}
            {previewState.status === 'success' && (
                <div
                    aria-hidden={!isPreviewReady}
                    className={cn(
                        'w-full',
                        !isPreviewReady && 'pointer-events-none absolute left-0 top-6 opacity-0'
                    )}
                >
                    {/* Keep the iframe hidden until it has been measured to avoid a visible resize jump. */}
                    <iframe
                        ref={previewIframeRef}
                        className='w-full rounded bg-white'
                        data-testid='welcome-email-preview-iframe'
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={previewState.html}
                        style={{height: previewHeight ? `${previewHeight}px` : '600px'}}
                        title='Welcome email preview'
                        onLoad={handlePreviewLoad}
                    />
                </div>
            )}
            {(previewState.status === 'error' || previewState.status === 'invalid') && (
                <div className='flex h-full items-center justify-center px-4' data-testid='welcome-email-preview-error'>
                    <Hint color='red'>{previewState.message}</Hint>
                </div>
            )}
        </div>
    );
};

export default WelcomeEmailPreviewFrame;
