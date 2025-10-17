import {useRef, useState, useEffect, forwardRef, useImperativeHandle} from 'react';
import {createPortal} from 'react-dom';

const Frame = forwardRef(function Frame(props, ref) {
    const {children, head, title = '', style = {}, dataTestId = '', dataDir = 'ltr', ...rest} = props;
    const nodeRef = useRef(null);
    const [iframeDocument, setIframeDocument] = useState(null);

    useImperativeHandle(ref, () => ({
        node: nodeRef.current
    }));

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) {
            return;
        }

        const handleLoad = () => {
            if (node.contentDocument) {
                const iframeHtml = node.contentDocument.documentElement;
                const iframeHead = node.contentDocument.head;
                const iframeRoot = node.contentDocument.body;
                iframeHtml.setAttribute('dir', dataDir);
                setIframeDocument({
                    head: iframeHead,
                    body: iframeRoot
                });
            }
        };

        node.addEventListener('load', handleLoad);

        // Check if iframe is already loaded (in case load event already fired)
        if (node.contentDocument && node.contentDocument.readyState === 'complete') {
            handleLoad();
        }

        return () => {
            node.removeEventListener('load', handleLoad);
        };
    }, [dataDir]);

    return (
        <iframe
            srcDoc={`<!DOCTYPE html>`}
            data-testid={dataTestId}
            ref={nodeRef}
            title={title}
            style={style}
            frameBorder="0"
            dir={dataDir}
            {...rest}
        >
            {iframeDocument?.head && createPortal(head, iframeDocument.head)}
            {iframeDocument?.body && createPortal(children, iframeDocument.body)}
        </iframe>
    );
});

export default Frame;
