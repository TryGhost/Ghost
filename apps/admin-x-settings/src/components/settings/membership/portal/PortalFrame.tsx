import React, {useEffect, useRef, useState} from 'react';

type PortalFrameProps = {
    selectedTab?: string;
    href: string;
}

// we should refactor this to be reused in offers as well
const PortalFrame: React.FC<PortalFrameProps> = ({selectedTab, href}) => {
    if (!selectedTab) {
        selectedTab = 'signup';
    }

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [portalReady, setPortalReady] = useState(false);

    useEffect(() => {
        const messageListener = (event: MessageEvent<'portal-ready' | {type: string}>) => {
            if (!href) {
                return;
            }
            const srcURL = new URL(href);
            const originURL = new URL(event.origin);

            if (originURL.origin === srcURL.origin) {
                if (event.data === 'portal-ready' || event.data.type === 'portal-ready') {
                    setPortalReady(true);
                }
            }
        };

        window.addEventListener('message', messageListener, true);
        return () => window.removeEventListener('message', messageListener, true);
    }, [href]);

    if (!href) {
        return null;
    }

    return (
        <>
            <iframe
                ref={iframeRef}
                className={!portalReady ? 'hidden' : ''}
                data-testid="portal-preview"
                height="100%"
                src={href}
                title="Portal Preview"
                width="100%"
            ></iframe>
        </>
    );
};

export default PortalFrame;
