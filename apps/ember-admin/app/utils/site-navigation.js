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
// trailing slash - '' for a root install. Navigation item URLs are stored
// *without* this prefix (Settings strips it on save); themes re-prepend it
// via urlFor('nav') when rendering.
function siteSubdirFor(blogUrl) {
    try {
        return new URL(blogUrl).pathname.replace(/\/+$/, '');
    } catch (e) {
        return '';
    }
}

function siteContextFor(blogUrl) {
    return {
        siteOrigin: siteOriginFor(blogUrl),
        siteSubdir: siteSubdirFor(blogUrl).toLowerCase()
    };
}

// normalizes absolute and relative urls down to a comparable pathname in the
// subdirectory-relative form Ghost stores, e.g. "https://site.com/blog/about/"
// and "/about/" both become "/about". urls pointing at other sites return
// null so they never match a local page.
function comparablePathname(url, {siteOrigin, siteSubdir} = {}) {
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

    let pathname = (parsed.pathname.replace(/\/+$/, '') || '/').toLowerCase();

    // strip a leading site subdirectory so absolute links and any legacy
    // double-prefixed relative links compare equal to the stored form.
    // require `${siteSubdir}/…` (not bare equality) so a page whose slug
    // matches the subdir segment (e.g. slug "blog" on /blog) stays "/blog"
    if (siteSubdir && pathname.startsWith(`${siteSubdir}/`)) {
        pathname = pathname.slice(siteSubdir.length) || '/';
    }

    return pathname;
}

// nav items store the page path subdirectory-relative, matching Ghost's
// default settings and what Settings → Navigation saves. blogUrl is accepted
// for call-site symmetry with getPagePlacement but does not affect the path.
export function pagePathForSlug(slug) {
    if (!slug) {
        return null;
    }

    return `/${slug}/`;
}

function itemsFor(settings, key) {
    return settings[key]?.toArray() ?? [];
}

function placementFor(settings, path, siteContext) {
    const pathToMatch = comparablePathname(path, siteContext);

    if (!pathToMatch) {
        return null;
    }

    return currentPlacementFor(
        itemsFor(settings, 'navigation'),
        itemsFor(settings, 'secondaryNavigation'),
        pathToMatch,
        siteContext
    );
}

// returns 'primary', 'secondary', or null depending on where (if anywhere)
// the page at `path` is linked in the site navigation
export function getPagePlacement(settings, path, blogUrl) {
    return placementFor(settings, path, siteContextFor(blogUrl));
}

function normalizePlacement(placement) {
    return (placement === 'primary' || placement === 'secondary') ? placement : null;
}

function currentPlacementFor(primary, secondary, pathToMatch, siteContext) {
    if (primary.some(item => comparablePathname(item.url, siteContext) === pathToMatch)) {
        return 'primary';
    }

    if (secondary.some(item => comparablePathname(item.url, siteContext) === pathToMatch)) {
        return 'secondary';
    }

    return null;
}

// applies the desired placement for one or more pages against the already
// loaded settings, saving once. Pages already in the destination are left
// alone so bulk updates don't reorder them. Existing label/url/icon/visibility
// are copied onto the moved item so navigation-editor customizations aren't
// lost. On failure reverts only the navigation attributes before rethrowing.
async function applyNavigationPlacement(settings, {pages, placement, siteContext}) {
    const desired = normalizePlacement(placement);

    const previousPrimary = settings.navigation;
    const previousSecondary = settings.secondaryNavigation;

    let primary = itemsFor(settings, 'navigation');
    let secondary = itemsFor(settings, 'secondaryNavigation');
    let changed = false;

    for (const page of pages) {
        const pathToMatch = comparablePathname(page.path, siteContext);

        if (!pathToMatch) {
            continue;
        }

        if (currentPlacementFor(primary, secondary, pathToMatch, siteContext) === desired) {
            continue;
        }

        const existing = [...primary, ...secondary]
            .find(item => comparablePathname(item.url, siteContext) === pathToMatch);

        const without = items => items.filter(item => comparablePathname(item.url, siteContext) !== pathToMatch);
        primary = without(primary);
        secondary = without(secondary);
        changed = true;

        if (desired === 'primary' || desired === 'secondary') {
            // copy rather than reuse/mutate: on save failure we restore the
            // previous arrays, and mutating the shared EmberObject would leave
            // isSecondary dirty on the reverted item
            const item = NavigationItem.create({
                // keep a blank label when moving an icon-only item; only fall
                // back to the page title when creating a brand-new nav entry
                label: existing ? existing.label : (page.label || 'Untitled'),
                url: existing?.url || page.path,
                icon: existing?.icon || '',
                visibility: existing?.visibility || 'public',
                isSecondary: desired === 'secondary'
            });

            if (desired === 'primary') {
                primary = [...primary, item];
            } else {
                secondary = [...secondary, item];
            }
        }
    }

    if (!changed) {
        return desired;
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

    const siteContext = siteContextFor(blogUrl);

    if (!comparablePathname(path, siteContext)) {
        return null;
    }

    const desired = normalizePlacement(placement);

    if (placementFor(settings, path, siteContext) === desired) {
        return desired;
    }

    return applyNavigationPlacement(settings, {pages: [{label, path}], placement: desired, siteContext});
}

// bulk variant - places every given page ({label, path}) into the same
// destination ('primary' | 'secondary' | null/none) in a single save
export async function setPagesNavigationPlacement(settings, {pages, placement, blogUrl}) {
    await settings.reload();

    return applyNavigationPlacement(settings, {
        pages,
        placement,
        siteContext: siteContextFor(blogUrl)
    });
}
