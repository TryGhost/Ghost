import React from 'react';
import {createPortal} from 'react-dom';

type IFrameProps = React.PropsWithChildren<{
    style: React.CSSProperties
    head: React.ReactNode;
    title: string;
    onResize?: (el: HTMLElement) => void;
} & Omit<React.ComponentProps<'iframe'>, 'onResize'>>

const IFrame: React.FC<IFrameProps> = ({children, head, title = '', onResize, style = {}, ...rest}) => {
    const [iframeHead, setIframeHead] = React.useState<HTMLHeadElement>();
    const [iframeRoot, setIframeRoot] = React.useState<HTMLElement>();

    // TODO: Migrate to callback ref when React 19 cleanup refs are available: https://react.dev/blog/2024/04/25/react-19#cleanup-functions-for-refs
    const node = React.useRef<HTMLIFrameElement>(null);
    React.useEffect(() => {
        function setupFrameBaseStyle() {
            if (node.current?.contentDocument) {
                const iframeRootLocal = node.current.contentDocument.body;
                // This is safe because of batched updates, new to React 18
                setIframeHead(node.current.contentDocument.head);
                setIframeRoot(iframeRootLocal);

                if (onResize) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (new ResizeObserver(_ => onResize(iframeRootLocal)))?.observe?.(iframeRootLocal);
                }

                // This is a bit hacky, but prevents us to need to attach even listeners to all the iframes we have
                // because when we want to listen for keydown events, those are only send in the window of iframe that is focused
                // To get around this, we pass down the keydown events to the main window
                // No need to detach, because the iframe would get removed
                node.current.contentWindow?.addEventListener('keydown', (e: KeyboardEvent | undefined) => {
                    // dispatch a new event
                    window.dispatchEvent(
                        new KeyboardEvent('keydown', e)
                    );
                });
            }
        }

        node.current?.addEventListener('load', setupFrameBaseStyle);

        return () => {
            node.current?.removeEventListener('load', setupFrameBaseStyle);
        };
    }, [onResize]);

    return (
        <iframe srcDoc={`<!DOCTYPE html>`} {...rest} ref={node} frameBorder="0" style={style} title={title}>
            {iframeHead && createPortal(head, iframeHead)}
            {iframeRoot && createPortal(children, iframeRoot)}
        </iframe>
    );
};

export default IFrame;
