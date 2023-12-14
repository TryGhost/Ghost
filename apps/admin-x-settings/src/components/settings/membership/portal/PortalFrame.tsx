import React, {useCallback, useEffect, useRef, useState} from 'react';

type PortalFrameProps = {
    href: string;
    onLoaded?: (iframe: HTMLIFrameElement) => void;
    onDestroyed?: () => void;
    selectedTab?: string;
}

const PortalFrame: React.FC<PortalFrameProps> = ({href, onLoaded, onDestroyed, selectedTab}) => {
    if (!selectedTab) {
        selectedTab = 'signup';
    }
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isInvisible, setIsInvisible] = useState<boolean>(true);

    // Handler for making the iframe visible, memoized with useCallback
    const makeVisible = useCallback(() => {
        setTimeout(() => {
            setIsInvisible(false);
            if (onLoaded && iframeRef.current) {
                onLoaded(iframeRef.current);
            }
        }, 100); // Delay to allow scripts to render
    }, [onLoaded]); // Dependencies for useCallback

    // Effect for attaching message listener
    useEffect(() => {
        const messageListener = (event: MessageEvent) => {
            if (!href) {
                return;
            }
            const originURL = new URL(event.origin);

            if (originURL.origin === new URL(href).origin) {
                if (event.data === 'portal-ready' || event.data.type === 'portal-ready') {
                    makeVisible();
                }
            }
        };

        window.addEventListener('message', messageListener, true);

        return () => {
            window.removeEventListener('message', messageListener, true);
            onDestroyed?.();
        };
    }, [href, onDestroyed, makeVisible]);

    if (!href) {
        return null;
    }

    return (
        <>
            <iframe
                ref={iframeRef}
                className={!isInvisible ? '' : 'hidden'}
                data-testid="portal-preview"
                height="100%"
                src={href}
                title="Portal Preview"
                width="100%"
                onLoad={makeVisible}
            />
        </>
    );
};

export default PortalFrame;
