import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';

type PortalFrameProps = {
    href: string;
    onDestroyed?: () => void;
    selectedTab?: string;
    portalParent?: string;
}

const PortalFrame: React.FC<PortalFrameProps> = ({href, onDestroyed, selectedTab, portalParent}) => {
    if (!selectedTab) {
        selectedTab = 'signup';
    }
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasLoaded, setHasLoaded] = useState<boolean>(false);
    const [isInvisible, setIsInvisible] = useState<boolean>(true);

    const makeVisible = useCallback(() => {
        setTimeout(() => {
            if (iframeRef.current) {
                setIsInvisible(false);
            }
        }, 300);
    }, [iframeRef]);

    useEffect(() => {
        const messageListener = (event: MessageEvent) => {
            if (!href) {
                return;
            }
            const originURL = new URL(event.origin);

            if (originURL.origin === new URL(href).origin) {
                if (event?.data?.type === 'portal-preview-ready') {
                    makeVisible();
                }
            }
        };

        window.addEventListener('message', messageListener, true);

        return () => {
            window.removeEventListener('message', messageListener, true);
            onDestroyed?.();
        };
    }, [href, onDestroyed, makeVisible, hasLoaded]);

    if (!href) {
        return null;
    }

    let loaderClassNames = 'mt-[-7%] flex h-screen items-center justify-center';
    let loaderVisibility = 'hidden';

    if (portalParent === 'preview') {
        loaderClassNames = 'absolute z-50 mt-[-7%] flex h-screen items-center justify-center';
        loaderVisibility = 'invisible';
    } else if (portalParent === 'offers') {
        loaderClassNames = 'absolute z-50 flex w-full h-full items-center justify-center';
        loaderVisibility = 'invisible';
    }

    return (
        <>{isInvisible && <div className={loaderClassNames}><span><LoadingIndicator /></span></div>}
            <iframe
                ref={iframeRef}
                className={!isInvisible && hasLoaded ? '' : loaderVisibility}
                data-testid="portal-preview"
                height="100%"
                src={href}
                title="Portal Preview"
                width="100%"
                onLoad={() => {
                    setHasLoaded(true);
                }}
            />
        </>
    );
};

export default PortalFrame;
