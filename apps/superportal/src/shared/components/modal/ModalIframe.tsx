import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/**
 * Renders `children` into a same-origin iframe for full CSS isolation from the
 * host theme. The iframe is a fixed full-viewport overlay; modal contents
 * position themselves inside it.
 *
 * The shell mounts exactly one of these for the whole page lifecycle (see
 * ModalService). Members / share / gift / search all swap their content into
 * the same iframe rather than tearing down and rebuilding.
 */
interface Props {
    children: ReactNode;
    /** Stylesheets injected into the iframe head, in order. Each is a CSS string. */
    styles?: string[];
    title?: string;
    /** Text direction applied to the iframe's `<html>` so logical utilities flip. */
    dir?: 'ltr' | 'rtl';
    /**
     * Called when Escape is pressed while focus is inside the iframe.
     *
     * Why this lives here: the iframe is same-origin (`srcDoc`), but key events
     * fired inside the iframe DO NOT bubble up to the parent document. A
     * `useEffect` in any React component (which runs in the parent) cannot
     * catch them. We must attach the listener to the iframe's own
     * `contentDocument` — only ModalIframe has that reference.
     */
    onEscape?: () => void;
}

interface IframeTargets {
    head: HTMLHeadElement;
    body: HTMLElement;
}

export function ModalIframe({children, styles, title = 'Ghost', dir = 'ltr', onEscape}: Props): ReactNode {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [targets, setTargets] = useState<IframeTargets | null>(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return undefined;

        const wireUp = (): void => {
            const doc = iframe.contentDocument;
            if (!doc) return;
            // Reset host-page body styles that would otherwise visually leak through.
            doc.body.style.margin = '0';
            doc.body.style.padding = '0';
            doc.documentElement.setAttribute('dir', dir);
            setTargets({head: doc.head, body: doc.body});
        };

        // The iframe has `srcDoc`, so its document is reachable immediately on most
        // browsers; on others we wait for `load`. Cover both.
        if (iframe.contentDocument && iframe.contentDocument.readyState !== 'loading') {
            wireUp();
        }
        iframe.addEventListener('load', wireUp);
        return () => iframe.removeEventListener('load', wireUp);
    }, []);

    // Keep the iframe `<html dir>` in sync if direction changes after wire-up.
    useEffect(() => {
        targets?.body.ownerDocument.documentElement.setAttribute('dir', dir);
    }, [targets, dir]);

    // Bind Escape on the iframe's own document — events inside the iframe don't
    // bubble to the parent, so the modal-service's parent-document listener
    // misses them whenever focus is in an input/button inside the modal.
    useEffect(() => {
        if (!targets || !onEscape) return undefined;
        const doc = targets.body.ownerDocument;
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onEscape();
        };
        doc.addEventListener('keydown', onKey);
        return () => doc.removeEventListener('keydown', onKey);
    }, [targets, onEscape]);

    return (
        <iframe
            ref={iframeRef}
            title={title}
            srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
            style={iframeStyle}
            data-testid="superportal-modal-iframe"
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
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    background: 'transparent',
    zIndex: 3999999
};
