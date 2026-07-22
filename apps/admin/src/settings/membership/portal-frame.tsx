import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingIndicator } from "@tryghost/shade/components";

/**
 * The live Portal preview iframe, ported from the legacy portal/portal-frame:
 * loads the site's portal-preview URL and reveals once the portal script
 * posts its `portal-preview-ready` message.
 */
export function PortalFrame({ href, selectedTab = "signup", onDestroyed }: {
    href: string;
    selectedTab?: string;
    onDestroyed?: () => void;
}) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isInvisible, setIsInvisible] = useState(true);

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
                if ((event.data as { type?: string } | null)?.type === "portal-preview-ready") {
                    makeVisible();
                }
            }
        };

        window.addEventListener("message", messageListener, true);

        return () => {
            window.removeEventListener("message", messageListener, true);
            onDestroyed?.();
        };
    }, [href, onDestroyed, makeVisible, hasLoaded]);

    if (!href) {
        return null;
    }

    return (
        <>
            {isInvisible && (
                <div className="absolute z-50 mt-[-7%] flex h-screen items-center justify-center">
                    <span><LoadingIndicator size="lg" /></span>
                </div>
            )}
            <iframe
                ref={iframeRef}
                className={!isInvisible && hasLoaded ? "" : "invisible"}
                data-testid="portal-preview"
                height="100%"
                src={href}
                title={`Portal Preview - ${selectedTab}`}
                width="100%"
                onLoad={() => {
                    setHasLoaded(true);
                }}
            />
        </>
    );
}
