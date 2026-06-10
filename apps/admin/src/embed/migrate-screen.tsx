import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "@tryghost/admin-x-framework";
import {useBrowseConfig} from "@tryghost/admin-x-framework/api/config";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";
import {useBrowseIntegrations} from "@tryghost/admin-x-framework/api/integrations";
import {getSettingValue, useBrowseSettings} from "@tryghost/admin-x-framework/api/settings";
import {hasAdminAccess, isOwnerUser} from "@tryghost/admin-x-framework/api/users";
import {getGhostPaths} from "@tryghost/admin-x-framework/helpers";
import {Button} from "@tryghost/shade/components";
import {LucideIcon} from "@tryghost/shade/utils";
import {crossShellNavigate} from "@/utils/cross-shell-navigate";
import {MIGRATE_URL, buildMigrateApiUrl, buildMigrateIframeSrc} from "./embed-urls";

/**
 * React port of the Ember /migrate screen (routes/migrate.js +
 * templates/migrate.hbs + gh-migrate-modal/iframe + services/migrate.js):
 * the self-serve migration app rendered as a fullscreen iframe modal.
 *
 * Owner & Administrator only — others are sent home, matching
 * routes/migrate.js.
 *
 * postMessage protocol (ported from gh-migrate-iframe.js):
 * - `{request: 'apiUrl'}` → respond with `initialData`: the admin API URL,
 *   the self-serve-migration integration API key, Stripe connection state,
 *   Ghost version and the owner's email
 * - `{route}` → routes outside /migrate leave the screen
 */
export default function MigrateScreen() {
    const params = useParams();
    const navigate = useNavigate();
    const {data: configData} = useBrowseConfig();
    const {data: currentUser} = useCurrentUser();
    const {data: integrationsData} = useBrowseIntegrations();
    const {data: settingsData} = useBrowseSettings();

    const platform = params["*"] || undefined;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [src] = useState(() => buildMigrateIframeSrc(platform));

    const isAdmin = currentUser ? hasAdminAccess(currentUser) : false;
    const shouldRedirect = Boolean(currentUser) && !isAdmin;

    useEffect(() => {
        if (shouldRedirect) {
            crossShellNavigate("/", {replace: true});
        }
    }, [shouldRedirect]);

    const settings = settingsData?.settings ?? null;
    const isStripeConnected = Boolean(
        getSettingValue(settings, "stripe_connect_account_id")
        && getSettingValue(settings, "stripe_connect_publishable_key")
        && getSettingValue(settings, "stripe_connect_livemode"),
    );
    const ghostVersion = configData?.config.version;
    const apiKey = integrationsData?.integrations
        .find(({slug}) => slug === "self-serve-migration")?.api_keys?.[0]?.secret;

    // Ember resolved the API key at reply time (services/migrate.js
    // postMessagePayload); here the queries may still be loading when the
    // iframe asks for its initialData, so a request arriving early is queued
    // and answered once everything is available.
    const initialDataLoaded = Boolean(configData && settingsData && integrationsData);
    const pendingUrlRequestRef = useRef(false);

    useEffect(() => {
        if (shouldRedirect) {
            return;
        }

        const migrateOrigin = new URL(MIGRATE_URL).origin;

        const handleUrlRequest = async () => {
            // Ember resolves the owner via its user store
            // (billing.getOwnerUser); fetch it the same way when the current
            // user isn't the owner themselves.
            let ownerEmail = currentUser && isOwnerUser(currentUser) ? currentUser.email : undefined;

            if (!ownerEmail) {
                try {
                    const {apiRoot} = getGhostPaths();
                    const response = await fetch(`${apiRoot}/users/?filter=role:Owner&limit=1`, {credentials: "include"});
                    const json = (await response.json()) as {users?: Array<{email?: string}>};
                    ownerEmail = json?.users?.[0]?.email;
                } catch {
                    // initialData is still useful without the owner email
                }
            }

            iframeRef.current?.contentWindow?.postMessage({
                request: "initialData",
                response: {
                    apiUrl: buildMigrateApiUrl(window.location.origin, getGhostPaths().adminRoot),
                    apiKey,
                    stripe: isStripeConnected,
                    ghostVersion,
                    ownerEmail,
                },
            }, migrateOrigin);
        };

        // a request that arrived before the queries finished is answered now
        if (pendingUrlRequestRef.current && initialDataLoaded) {
            pendingUrlRequestRef.current = false;
            void handleUrlRequest();
        }

        const handleMessage = (event: MessageEvent) => {
            // Only process messages coming from the migrate iframe
            if (!event.data || event.origin !== migrateOrigin) {
                return;
            }

            const data = event.data as {request?: string; route?: string; siteData?: Record<string, unknown>};

            if (data.request === "apiUrl") {
                if (!initialDataLoaded) {
                    // defer the reply until the API key & co are available
                    pendingUrlRequestRef.current = true;
                    return;
                }
                void handleUrlRequest();
                return;
            }

            if (data.route && !data.route.includes("/migrate")) {
                // The migration app can break out of the iframe into other
                // admin screens (potentially Ember-owned)
                crossShellNavigate(data.route);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [shouldRedirect, currentUser, apiKey, isStripeConnected, ghostVersion, initialDataLoaded]);

    if (!currentUser || shouldRedirect) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-white" data-testid="migrate-window">
            <div className="absolute top-2 right-2 z-10">
                <Button data-testid="close-migrate" variant="ghost" onClick={() => navigate("/settings/migration")}>
                    <LucideIcon.X />
                    <span className="sr-only">Close</span>
                </Button>
            </div>
            <iframe
                ref={iframeRef}
                className="migrate-frame h-full w-full border-0"
                data-testid="migrate-frame"
                id="migrate-frame"
                src={src}
                title="migrate"
            />
        </div>
    );
}
