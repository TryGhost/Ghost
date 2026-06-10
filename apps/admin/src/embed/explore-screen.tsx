import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "@tryghost/admin-x-framework";
import {useBrowseIntegrations} from "@tryghost/admin-x-framework/api/integrations";
import {getGhostPaths} from "@tryghost/admin-x-framework/helpers";
import {Button} from "@tryghost/shade/components";
import {LucideIcon} from "@tryghost/shade/utils";
import {useUserPreferences} from "@/hooks/user-preferences";
import {crossShellNavigate} from "@/utils/cross-shell-navigate";
import {EXPLORE_SUBMIT_ROUTE, EXPLORE_URL, buildExploreApiUrl, buildExploreIframeSrc} from "./embed-urls";

const EXPLORE_ROUTE_ROOT = "#/explore";

/**
 * React port of the Ember /explore screens (routes/explore/* +
 * gh-explore-modal/iframe + services/explore.js): the Ghost Explore directory
 * rendered fullscreen in an iframe, plus the admin-rendered /explore/connect
 * screen that shares the site's Explore integration credentials with the
 * Explore surface.
 *
 * postMessage protocol (ported from gh-explore-iframe.js):
 * - `{request: 'apiUrl'}` → respond with the site API URL + dark mode
 * - `{route}` → sync the admin URL hash; `connect` breaks out of the iframe
 *   into the admin-rendered connect screen, non-explore routes leave /explore
 * - `{siteData}` → cached (Explore reports whether the site is listed)
 */
export default function ExploreScreen() {
    const params = useParams();
    const navigate = useNavigate();
    const {data: preferences} = useUserPreferences();

    const subPath = params["*"] ?? "";
    const isConnect = subPath === "connect" || subPath.startsWith("connect/");
    const nightShift = Boolean(preferences?.nightShift);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Whether the connect screen was reached from inside the Explore iframe
    // (vs a direct deep link) — mirrors explore.isIframeTransition and decides
    // whether closing/submitting talks to the iframe or leaves the screen.
    const [isIframeTransition, setIsIframeTransition] = useState(false);
    const [siteData, setSiteData] = useState<Record<string, unknown> | null>(null);

    // The iframe src is set once on mount; afterwards Explore drives its own
    // navigation and posts route messages that we sync into the URL hash.
    const [src] = useState(() => buildExploreIframeSrc(subPath));

    const sendRouteUpdate = (route: {path: string; queryParams?: string}) => {
        iframeRef.current?.contentWindow?.postMessage({
            query: "routeUpdate",
            response: route,
        }, "*");
    };

    useEffect(() => {
        const apiUrl = buildExploreApiUrl(window.location.origin, getGhostPaths().subdir);
        const exploreOrigin = new URL(EXPLORE_URL).origin;

        // Keep the visible admin URL in sync with the Explore iframe's route
        // without adding history entries (services/explore.js
        // handleRouteChangeInIframe)
        const syncHash = (destinationRoute: string) => {
            let exploreRoute = EXPLORE_ROUTE_ROOT;

            if (/^\/explore(\/.*)?/.test(destinationRoute)) {
                destinationRoute = destinationRoute.replace(/\/explore/, "");
            }

            if (destinationRoute !== "/") {
                exploreRoute += destinationRoute;
            }

            if (window.location.hash !== exploreRoute) {
                window.history.replaceState(window.history.state, "", exploreRoute);
            }
        };

        const handleMessage = (event: MessageEvent) => {
            // only process messages coming from the explore iframe — exact
            // origin match (a substring check would let near-miss origins
            // like https://ghost.or through)
            if (!event.data || event.origin !== exploreOrigin) {
                return;
            }

            const data = event.data as {request?: string; route?: string; siteData?: Record<string, unknown>};

            if (data.request === "apiUrl") {
                iframeRef.current?.contentWindow?.postMessage({
                    request: "apiUrl",
                    response: {apiUrl, darkMode: nightShift},
                }, "*");
            }

            if (data.route) {
                if (data.route.includes("connect")) {
                    // Explore breaks out of the iframe into the
                    // admin-rendered connect screen
                    setIsIframeTransition(true);
                    navigate("/explore/connect");
                } else if (data.route.includes("/explore")) {
                    syncHash(data.route);
                } else {
                    // Routes outside /explore leave the screen entirely (the
                    // target may be Ember-owned, so navigate cross-shell)
                    crossShellNavigate(data.route);
                }
            }

            if (data.siteData) {
                setSiteData(data.siteData);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [navigate, nightShift]);

    // Mirror gh-explore-iframe's did-update on nightShift: let the already
    // loaded Explore surface switch its theme
    useEffect(() => {
        iframeRef.current?.contentWindow?.postMessage({
            query: "uiUpdate",
            response: {darkMode: nightShift},
        }, "*");
    }, [nightShift]);

    return (
        <div className="fixed inset-0 z-50 bg-white" data-testid="explore-window">
            <iframe
                ref={iframeRef}
                className={`explore-frame h-full w-full border-0 ${isConnect ? "hidden" : ""}`}
                data-testid="explore-frame"
                id="explore-frame"
                src={src}
                title="Explore"
            />
            {isConnect && (
                <ExploreConnect
                    isIframeTransition={isIframeTransition}
                    sendRouteUpdate={sendRouteUpdate}
                    siteData={siteData}
                />
            )}
        </div>
    );
}

/**
 * The /explore/connect screen (templates/explore/connect.hbs +
 * controllers/explore.js): a permission summary and a connect button that
 * hands the site's Explore integration credentials to the Explore surface.
 */
function ExploreConnect({isIframeTransition, sendRouteUpdate, siteData}: {
    isIframeTransition: boolean;
    sendRouteUpdate: (route: {path: string; queryParams?: string}) => void;
    siteData: Record<string, unknown> | null;
}) {
    const navigate = useNavigate();
    const {data: integrationsData} = useBrowseIntegrations();

    const apiUrl = buildExploreApiUrl(window.location.origin, getGhostPaths().subdir);

    const exploreIntegration = integrationsData?.integrations.find(({slug}) => slug === "ghost-explore");
    const token = exploreIntegration?.api_keys?.find(({type}) => type === "admin")?.secret;

    const closeConnect = () => {
        if (isIframeTransition) {
            sendRouteUpdate({path: "/explore"});
            navigate("/explore");
        } else {
            crossShellNavigate("/analytics");
        }
    };

    const submitExploreSite = () => {
        if (!token) {
            return;
        }

        const query = new URLSearchParams();
        query.append("token", token);
        query.append("url", apiUrl);

        if (isIframeTransition) {
            sendRouteUpdate({path: EXPLORE_SUBMIT_ROUTE, queryParams: query.toString()});

            // Give Explore enough time to navigate to the submit page and
            // fetch the required site data before re-showing the iframe
            setTimeout(() => {
                navigate("/explore");
            }, 500);
        } else {
            // Ghost Explore URL to submit a new site
            const destination = new URL(`${EXPLORE_URL}${EXPLORE_SUBMIT_ROUTE}`);
            destination.search = query.toString();

            window.location.href = destination.toString();
        }
    };

    // Explore reports site data once connected; nothing on the connect screen
    // depends on it yet but keeping the reference mirrors the Ember service
    void siteData;

    return (
        <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-white" data-testid="explore-connect">
            <div className="flex w-full justify-end p-6">
                <Button data-testid="close-explore" variant="ghost" onClick={closeConnect}>
                    <LucideIcon.X />
                    <span className="sr-only">Close</span>
                </Button>
            </div>
            <div className="flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-6 pb-16">
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-3xl font-bold">Connect to Ghost Explore.</h1>
                    <p className="text-sm text-muted-foreground" data-testid="explore-api-url">{apiUrl}</p>
                </div>
                <div className="flex flex-col gap-4">
                    {[
                        "Allow read-only access to your site data to create a directory listing.",
                        "You’ll be able to choose what data is shown publicly or hidden.",
                        "Your site will be promoted across the entire Ghost ecosystem.",
                    ].map(permission => (
                        <div key={permission} className="flex items-start gap-3">
                            <LucideIcon.CircleCheck className="mt-0.5 shrink-0 text-green-600" size={20} />
                            <p>{permission}</p>
                        </div>
                    ))}
                </div>
                <Button className="self-center" data-testid="submit-explore" disabled={!token} size="lg" onClick={submitExploreSite}>
                    Connect data &amp; edit listing
                    <LucideIcon.ArrowRight />
                </Button>
            </div>
        </div>
    );
}
