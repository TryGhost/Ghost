import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

interface Props {
    children: ReactNode;
    styles?: string[];
    title?: string;
    /** Text direction: sets the iframe `<html dir>` and anchors it to the start side. */
    dir?: 'ltr' | 'rtl';
}

interface IframeTargets {
    head: HTMLHeadElement;
    body: HTMLElement;
}

export function NotificationIframe({children, styles, title = 'Ghost notification', dir = 'ltr'}: Props): ReactNode {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [targets, setTargets] = useState<IframeTargets | null>(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return undefined;

        const wireUp = (): void => {
            const doc = iframe.contentDocument;
            if (!doc) return;
            doc.body.style.margin = '0';
            doc.body.style.padding = '0';
            doc.documentElement.setAttribute('dir', dir);
            setTargets({head: doc.head, body: doc.body});
        };

        if (iframe.contentDocument && iframe.contentDocument.readyState !== 'loading') {
            wireUp();
        }
        iframe.addEventListener('load', wireUp);
        return () => iframe.removeEventListener('load', wireUp);
    }, [dir]);

    // Anchor the toast iframe to the locale's start side (top-right LTR, top-left RTL).
    const anchoredStyle: CSSProperties = {...iframeStyle, ...(dir === 'rtl' ? {left: 0} : {right: 0})};

    return (
        <iframe
            ref={iframeRef}
            title={title}
            srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
            style={anchoredStyle}
            data-testid="superportal-notification-iframe"
        >
            {targets && styles && styles.length > 0 ? createPortal(
                <>{styles.map((css, i) => <style key={i}>{css}</style>)}</>,
                targets.head
            ) : null}
            {targets ? createPortal(children, targets.body) : null}
        </iframe>
    );
}

const iframeStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    width: '100%',
    maxWidth: '420px',
    height: '280px',
    border: 0,
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 4000000
};
