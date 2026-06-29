import NavigationItem from 'ghost-admin/models/navigation-item';
import {A as emberA} from '@ember/array';

const RELATIVE_URL_BASE = 'http://__ghost-relative__.invalid';
const RELATIVE_URL_ORIGIN = new URL(RELATIVE_URL_BASE).origin;

// the configured site's origin, used to recognise absolute nav links pointing
// at this site. Returns null when blogUrl is missing/unparseable, in which
// case only relative links are matched.
function siteOriginFor(blogUrl) {
    try {
        return new URL(blogUrl).origin;
    } catch (e) {
        return null;
    }
}

// the configured site's subdirectory (the pathname of blogUrl), without a
// trailing slash - '' for a root install. Pages and their nav links live
// under this, so e.g. on a site at example.com/blog the page /about/ is
// served (and linked) at /blog/about/.
function siteSubdirFor(blogUrl) {
    try {
        return new URL(blogUrl).pathname.replace(/\/+$/, '');
    } catch (e) {
        return '';
    }
}

// normalizes absolute and relative urls down to a comparable pathname,
// e.g. "https://site.com/about/" -> "/about" and "about/" -> "/about".
// urls pointing at other sites (external nav links) return null so they
// never match a local page
function comparablePathname(url, siteOrigin) {
    if (!url) {
        return null;
    }

    let parsed;
    try {
        parsed = new URL(url, RELATIVE_URL_BASE);
    } catch (e) {
        return null;
    }

    // an absolute url only counts as local when we have a site origin to
    // confirm it against - without one (missing/unparseable blogUrl) it can't
    // be verified, so treat it as external rather than matching by pathname
    const isRelative = parsed.origin === RELATIVE_URL_ORIGIN;
    if (!isRelative && (!siteOrigin || parsed.origin !== siteOrigin)) {
        return null;
    }

    const pathname = parsed.pathname.replace(/\/+$/, '');

    return (pathname || '/').toLowerCase();
}

// pages are served at <subdir>/:slug/ (subdir is empty on a root install),
// matching the verbatim url stored for a nav item that points at the page
export function pagePathForSlug(slug, blogUrl) {
    if (!slug) {
        return null;
    }

    return `${siteSubdirFor(blogUrl)}/${slug}/`;
}

function itemsFor(settings, key) {
    return settings[key]?.toArray() ?? [];
}

function placementFor(settings, path, siteOrigin) {
    const pathToMatch = comparablePathname(path, siteOrigin);

    if (!pathToMatch) {
        return null;
    }

    const matches = items => items.some(item => comparablePathname(item.url, siteOrigin) === pathToMatch);

    if (matches(itemsFor(settings, 'navigation'))) {
        return 'primary';
    }

    if (matches(itemsFor(settings, 'secondaryNavigation'))) {
        return 'secondary';
    }

    return null;
}

// returns 'primary', 'secondary', or null depending on where (if anywhere)
// the page at `path` is linked in the site navigation
export function getPagePlacement(settings, path, blogUrl) {
    return placementFor(settings, path, siteOriginFor(blogUrl));
}

function normalizePlacement(placement) {
    return (placement === 'primary' || placement === 'secondary') ? placement : null;
}

// applies the desired placement for one or more pages against the already
// loaded settings, saving once. Existing label/url are preserved so any
// customization made in the navigation editor isn't lost. On failure reverts
// only the navigation attributes before rethrowing.
async function applyNavigationPlacement(settings, {pages, placement, siteOrigin}) {
    const desired = normalizePlacement(placement);

    const previousPrimary = settings.navigation;
    const previousSecondary = settings.secondaryNavigation;

    let primary = itemsFor(settings, 'navigation');
    let secondary = itemsFor(settings, 'secondaryNavigation');

    for (const page of pages) {
        const pathToMatch = comparablePathname(page.path, siteOrigin);

        if (!pathToMatch) {
            continue;
        }

        const existing = [...primary, ...secondary]
            .find(item => comparablePathname(item.url, siteOrigin) === pathToMatch);
        const itemLabel = existing?.label || page.label || 'Untitled';
        const itemUrl = existing?.url || page.path;

        const without = items => items.filter(item => comparablePathname(item.url, siteOrigin) !== pathToMatch);
        primary = without(primary);
        secondary = without(secondary);

        if (desired === 'primary') {
            primary = [...primary, NavigationItem.create({label: itemLabel, url: itemUrl, isSecondary: false})];
        } else if (desired === 'secondary') {
            secondary = [...secondary, NavigationItem.create({label: itemLabel, url: itemUrl, isSecondary: true})];
        }
    }

    try {
        settings.navigation = emberA(primary);
        settings.secondaryNavigation = emberA(secondary);

        await settings.save();

        return desired;
    } catch (error) {
        if (settings.settingsModel) {
            settings.navigation = previousPrimary;
            settings.secondaryNavigation = previousSecondary;
        }

        throw error;
    }
}

// moves a page's navigation link to match the desired placement
// ('primary' | 'secondary' | null/none), handling add, move between menus,
// and removal in one operation. No-ops (without saving) when already in the
// desired state. Reloads settings first to avoid clobbering a concurrent
// change. Returns the resulting placement.
export async function setPageNavigationPlacement(settings, {label, path, placement, blogUrl}) {
    await settings.reload();

    const siteOrigin = siteOriginFor(blogUrl);

    if (!comparablePathname(path, siteOrigin)) {
        return null;
    }

    const desired = normalizePlacement(placement);

    if (placementFor(settings, path, siteOrigin) === desired) {
        return desired;
    }

    return applyNavigationPlacement(settings, {pages: [{label, path}], placement: desired, siteOrigin});
}

// bulk variant - places every given page ({label, path}) into the same
// destination ('primary' | 'secondary' | null/none) in a single save
export async function setPagesNavigationPlacement(settings, {pages, placement, blogUrl}) {
    await settings.reload();

    return applyNavigationPlacement(settings, {pages, placement, siteOrigin: siteOriginFor(blogUrl)});
}
