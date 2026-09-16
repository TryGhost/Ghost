import NavigationItem from 'ghost-admin/models/navigation-item';
import {A as emberA} from '@ember/array';

const RELATIVE_URL_BASE = 'http://__ghost-relative__.invalid';
const RELATIVE_URL_ORIGIN = new URL(RELATIVE_URL_BASE).origin;

function siteOriginFor(blogUrl) {
    try {
        return new URL(blogUrl).origin;
    } catch (e) {
        return null;
    }
}

// blogUrl pathname without a trailing slash ('' for root installs).
// Nav items store paths without this; the theme adds it back when rendering.
function siteSubdirFor(blogUrl) {
    try {
        return new URL(blogUrl).pathname.replace(/\/+$/, '');
    } catch (e) {
        return '';
    }
}

function siteContextFor(blogUrl, pageRoutes = {}) {
    const context = {
        siteOrigin: siteOriginFor(blogUrl),
        siteSubdir: siteSubdirFor(blogUrl).toLowerCase()
    };

    const routes = Object.entries(pageRoutes).map(([slug, path]) => [
        comparablePathname(pagePathForSlug(slug), context),
        comparablePathname(path, context)
    ]);
    const destinations = new Set(routes.map(([, path]) => path));

    // Slug URLs redirect to the custom route, unless another custom route
    // occupies that URL. Compare aliases without rewriting stored links.
    context.pageRedirects = new Map(routes.filter(([source, destination]) => source && destination && !destinations.has(source)));

    return context;
}

// Pathname comparable to how Ghost stores nav urls (no site subdirectory).
// Absolute urls outside the site origin or subdirectory return null.
// Relative paths already exclude the install subdirectory. Only absolute
// URLs need that prefix removed, and only once.
function comparablePathname(url, {siteOrigin, siteSubdir, pageRedirects} = {}) {
    if (!url) {
        return null;
    }

    let parsed;
    try {
        parsed = new URL(url, RELATIVE_URL_BASE);
    } catch (e) {
        return null;
    }

    const isRelative = parsed.origin === RELATIVE_URL_ORIGIN;
    if (!isRelative && (!siteOrigin || parsed.origin !== siteOrigin)) {
        return null;
    }

    let pathname = (parsed.pathname.replace(/\/+$/, '') || '/').toLowerCase();

    if (!isRelative && siteSubdir) {
        if (pathname === siteSubdir) {
            return '/';
        }

        if (!pathname.startsWith(`${siteSubdir}/`)) {
            return null;
        }
        pathname = pathname.slice(siteSubdir.length) || '/';
    }

    return pageRedirects?.get(pathname) ?? pathname;
}

// Path form stored in Settings -> Navigation (no site subdirectory).
export function pagePathForSlug(slug, pageRoutes = {}) {
    if (!slug) {
        return null;
    }

    // Older servers don't expose pageRoutes. Keep their existing slug paths.
    return Object.prototype.hasOwnProperty.call(pageRoutes, slug) ? pageRoutes[slug] : `/${slug}/`;
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

export function getPagePlacement(settings, path, blogUrl, pageRoutes) {
    return placementFor(settings, path, siteContextFor(blogUrl, pageRoutes));
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

// One settings save for all pages. Skip pages already in the destination so
// bulk ops don't reshuffle the menu. Keep label/url/icon/visibility when
// moving. On save failure, put navigation back the way it was.
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
            // New object so a failed save can restore the old arrays without
            // leaving isSecondary dirty on a shared EmberObject.
            const item = NavigationItem.create({
                // '' is valid for icon-only items; only use the page title for new entries
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

// Add/move/remove one page. Reload settings first so we don't overwrite
// someone else's edit. Skip the save if nothing would change.
export async function setPageNavigationPlacement(settings, {label, path, placement, blogUrl, pageRoutes}) {
    await settings.reload();

    const siteContext = siteContextFor(blogUrl, pageRoutes);

    if (!comparablePathname(path, siteContext)) {
        return null;
    }

    const desired = normalizePlacement(placement);

    if (placementFor(settings, path, siteContext) === desired) {
        return desired;
    }

    return applyNavigationPlacement(settings, {pages: [{label, path}], placement: desired, siteContext});
}

export async function setPagesNavigationPlacement(settings, {pages, placement, blogUrl, pageRoutes}) {
    await settings.reload();

    return applyNavigationPlacement(settings, {
        pages,
        placement,
        siteContext: siteContextFor(blogUrl, pageRoutes)
    });
}
