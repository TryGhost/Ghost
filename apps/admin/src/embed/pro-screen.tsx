import {useEffect, useRef, useState} from "react";
import {useQueryClient} from "@tryghost/admin-x-framework";
import {useBrowseConfig} from "@tryghost/admin-x-framework/api/config";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";
import {isOwnerUser} from "@tryghost/admin-x-framework/api/users";
import {getGhostPaths} from "@tryghost/admin-x-framework/helpers";
import {crossShellNavigate} from "@/utils/cross-shell-navigate";
import {buildBillingIframeSrc} from "./embed-urls";

const BILLING_ROUTE_ROOT = "#/pro";

function getBillingAppOrigin(billingUrl: string): string | null {
    try {
        return new URL(billingUrl).origin;
    } catch {
        return null;
    }
}

/**
 * React port of the Ember /pro screen: the Ghost(Pro) billing app (BMA)
 * rendered fullscreen in an iframe (routes/pro.js + gh-billing-modal/iframe +
 * services/billing.js).
 *
 * Access rules mirror routes/pro.js: only the owner may open billing, except
 * in a force-upgrade state where every user can reach it (the BMA itself
 * receives `isOwner: false` via the token/forceUpgradeInfo exchange and
 * renders the appropriate messaging).
 *
 * postMessage protocol (ported minimally from gh-billing-iframe.js):
 * - `{request: 'token'}` → respond with an identity token from
 *   /ghost/api/admin/identities/ (null for non-owners)
 * - `{request: 'forceUpgradeInfo'}` → respond with force-upgrade state +
 *   owner info
 * - `{request: 'billingAppReady'}` → hide the loading state
 * - `{route}` → sync the admin URL hash (history.replaceState, no new entry)
 * - `{subscription}` → refetch config/settings so limits and force-upgrade
 *   state update (the Ember version also reloads its limit service and shows
 *   grace-period alerts; not ported)
 */
export default function ProScreen() {
    const {data: configData} = useBrowseConfig();
    const {data: currentUser} = useCurrentUser();
    const queryClient = useQueryClient();

    const config = configData?.config;
    const forceUpgrade = Boolean(config?.hostSettings?.forceUpgrade);
    const billingUrl = config?.hostSettings?.billing?.url;
    const isOwner = currentUser ? isOwnerUser(currentUser) : false;

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [appReady, setAppReady] = useState(false);

    // The iframe src is computed once from the URL hash at mount (deep links
    // like #/pro/billing or #/pro?action=checkout open the matching BMA
    // route); afterwards the BMA drives its own navigation and we only sync
    // the hash back via replaceState.
    const [src, setSrc] = useState<string | null>(null);

    const loaded = Boolean(config && currentUser);
    const shouldRedirect = loaded && (!billingUrl || (!isOwner && !forceUpgrade));

    useEffect(() => {
        if (shouldRedirect) {
            crossShellNavigate("/", {replace: true});
        }
    }, [shouldRedirect]);

    useEffect(() => {
        if (billingUrl && !shouldRedirect) {
            setSrc(current => current ?? buildBillingIframeSrc(billingUrl, window.location.hash));
        }
    }, [billingUrl, shouldRedirect]);

    useEffect(() => {
        if (!billingUrl || shouldRedirect) {
            return;
        }

        const billingOrigin = getBillingAppOrigin(billingUrl);

        const postToBillingIframe = (message: unknown) => {
            const billingIframeWindow = iframeRef.current?.contentWindow;

            if (billingIframeWindow && billingOrigin) {
                billingIframeWindow.postMessage(message, billingOrigin);
            }
        };

        // Keep the visible admin URL in sync with the BMA's internal route
        // without adding history entries (services/billing.js
        // handleRouteChangeInIframe)
        const handleRouteChangeInIframe = (destinationRoute: string) => {
            let billingRoute = BILLING_ROUTE_ROOT;

            if (destinationRoute !== "/") {
                billingRoute += destinationRoute;
            }

            if (window.location.hash !== billingRoute) {
                window.history.replaceState(window.history.state, "", billingRoute);
            }
        };

        // The BMA authenticates the owner by exchanging an identity token
        // (gh-billing-iframe.js _handleTokenRequest). Non-owners get a null
        // token so the BMA isn't left waiting.
        const handleTokenRequest = async () => {
            if (!isOwner) {
                postToBillingIframe({request: "token", response: null});
                return;
            }

            try {
                const {apiRoot} = getGhostPaths();
                const response = await fetch(`${apiRoot}/identities/`, {credentials: "include"});

                if (!response.ok) {
                    throw new Error(`Identity request failed: ${response.status}`);
                }

                const json = (await response.json()) as {identities?: Array<{token?: string}>};
                postToBillingIframe({request: "token", response: json?.identities?.[0]?.token ?? null});
            } catch {
                postToBillingIframe({request: "token", response: null});
            }
        };

        const handleForceUpgradeRequest = async () => {
            // Ember resolves the owner user from its store regardless of who
            // is signed in (services/billing.js getOwnerUser) — the BMA shows
            // non-owners who to contact, so fetch the owner via the users API
            // when the current user isn't the owner themselves.
            let ownerUser = isOwner && currentUser
                ? {name: currentUser.name, email: currentUser.email}
                : null;

            if (!ownerUser) {
                try {
                    const {apiRoot} = getGhostPaths();
                    const response = await fetch(`${apiRoot}/users/?filter=role:Owner&limit=1`, {credentials: "include"});
                    const json = (await response.json()) as {users?: Array<{name?: string; email?: string}>};
                    const owner = json?.users?.[0];

                    if (owner) {
                        ownerUser = {name: owner.name ?? "", email: owner.email ?? ""};
                    }
                } catch {
                    // the reply is still useful without the owner details
                }
            }

            postToBillingIframe({
                request: "forceUpgradeInfo",
                response: {forceUpgrade, isOwner, ownerUser},
            });
        };

        const handleSubscriptionUpdate = () => {
            // Refetch config (billing limits, forceUpgrade) and settings so
            // the rest of the admin reacts to plan changes.
            queryClient.refetchQueries({queryKey: ["ConfigResponseType"]}).catch(() => {});
            queryClient.refetchQueries({queryKey: ["SettingsResponseType"]}).catch(() => {});
        };

        const handleMessage = (event: MessageEvent) => {
            if (!event.data) {
                return;
            }

            if (!billingOrigin || event.origin !== billingOrigin) {
                return;
            }

            if (event.source !== iframeRef.current?.contentWindow) {
                return;
            }

            const data = event.data as {request?: string; route?: string; subscription?: unknown};

            if (data.request === "billingAppReady") {
                setAppReady(true);
            }

            if (data.route) {
                handleRouteChangeInIframe(data.route);
            }

            if (data.request === "token") {
                void handleTokenRequest();
            }

            if (data.request === "forceUpgradeInfo") {
                void handleForceUpgradeRequest();
            }

            if (data.subscription) {
                handleSubscriptionUpdate();
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [billingUrl, shouldRedirect, isOwner, forceUpgrade, currentUser, queryClient]);

    if (!loaded || shouldRedirect) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-white" data-testid="billing-window">
            <iframe
                ref={iframeRef}
                allow="clipboard-write"
                className="billing-frame h-full w-full border-0"
                data-testid="billing-frame"
                id="billing-frame"
                src={src ?? undefined}
                title="Billing"
            />
            {!appReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-white" data-testid="billing-loading">
                    <div className="gh-loading-spinner" />
                </div>
            )}
        </div>
    );
}
