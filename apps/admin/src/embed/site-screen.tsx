import {useLocation} from "@tryghost/admin-x-framework";
import {useBrowseSite} from "@tryghost/admin-x-framework/api/site";
import {buildSiteSrcUrl} from "./embed-urls";

/**
 * React port of the Ember /site screen (templates/site.hbs +
 * gh-site-iframe.js): the front-end site rendered in an iframe that fills the
 * content area next to the admin sidebar.
 *
 * The Ember route used a fresh timestamp as its model on every transition so
 * that re-clicking the Site nav item resets the iframe back to the homepage.
 * Here the router `location.key` serves the same purpose — every navigation
 * (including same-path ones) pushes a new key, which changes the `v=` param
 * and therefore the iframe src, forcing a reload.
 */
export default function SiteScreen() {
    // the public /site payload carries the front-end URL — the admin /config
    // endpoint has no blogUrl (Ember synthesizes it from /site too)
    const {data} = useBrowseSite();
    const location = useLocation();

    const blogUrl = data?.site.url;

    if (!blogUrl) {
        return null;
    }

    const src = buildSiteSrcUrl(blogUrl, location.key);

    return (
        <div className="relative h-full w-full">
            <iframe
                className="site-frame absolute inset-0 h-full w-full border-0"
                data-testid="site-frame"
                src={src}
                title="Site"
            />
        </div>
    );
}
