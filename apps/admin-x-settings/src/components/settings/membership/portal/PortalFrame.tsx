import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ReactComponent as SpinnerIcon} from '../../../../assets/icons/spinner.svg';

type PortalFrameProps = {
    href: string;
    onDestroyed?: () => void;
    selectedTab?: string;
}

const PortalFrame: React.FC<PortalFrameProps> = ({href, onDestroyed, selectedTab}) => {
    if (!selectedTab) {
        selectedTab = 'signup';
    }
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasLoaded, setHasLoaded] = useState<boolean>(false);
    const [isInvisible, setIsInvisible] = useState<boolean>(true);

    // Handler for making the iframe visible, memoized with useCallback
    const makeVisible = useCallback(() => {
        setTimeout(() => {
            if (iframeRef.current) {
                setIsInvisible(false);
            }
        }, 100); // Delay to allow scripts to render
    }, [iframeRef]); // Dependencies for useCallback

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

        if (hasLoaded) {
            window.addEventListener('message', messageListener, true);
        }

        return () => {
            window.removeEventListener('message', messageListener, true);
            onDestroyed?.();
        };
    }, [href, onDestroyed, makeVisible, hasLoaded]);

    if (!href) {
        return null;
    }

    return (
        <>{!hasLoaded && <div className="flex h-screen items-center justify-center"><span><SpinnerIcon className="mb-6 h-20 w-20" /></span></div>}
            <iframe
                ref={iframeRef}
                className={!isInvisible ? '' : 'hidden'}
                data-testid="portal-preview"
                height="100%"
                src={href}
                title="Portal Preview"
                width="100%"
                onLoad={() => {
                    setHasLoaded(true);
                    makeVisible();
                }}
            />
        </>
    );
};

export default PortalFrame;
