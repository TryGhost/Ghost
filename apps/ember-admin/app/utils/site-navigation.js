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

// pathname of blogUrl without trailing slash ('' on a root install).
// Nav urls are stored without this prefix; themes re-prepend it on render.
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

// Normalize to the subdirectory-relative pathname Ghost stores.
// External absolute urls return null. Strips a leading site subdir so
// https://site.com/blog/about/ and /about/ both become /about — but only
// when the path continues past the subdir, so slug "blog" on /blog stays /blog.
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

    const isRelative = parsed.origin === RELATIVE_URL_ORIGIN;
    if (!isRelative && (!siteOrigin || parsed.origin !== siteOrigin)) {
        return null;
    }

    let pathname = (parsed.pathname.replace(/\/+$/, '') || '/').toLowerCase();

    if (siteSubdir && pathname.startsWith(`${siteSubdir}/`)) {
        pathname = pathname.slice(siteSubdir.length) || '/';
    }

    return pathname;
}

// Subdirectory-relative path matching what Settings → Navigation stores.
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

// Place pages in one save. Leaves pages already in the destination alone so
// bulk updates don't reorder them. Copies label/url/icon/visibility when
// moving. On failure, reverts only the navigation attributes.
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
            // Copy rather than mutate: on save failure we restore the previous
            // arrays, and mutating would leave isSecondary dirty on revert.
            const item = NavigationItem.create({
                // Keep blank labels on icon-only items; fall back to the page
                // title only when creating a new entry.
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

// Add, move, or remove a page's nav link. Reloads settings first to avoid
// clobbering concurrent edits. No-ops when already in the desired state.
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

export async function setPagesNavigationPlacement(settings, {pages, placement, blogUrl}) {
    await settings.reload();

    return applyNavigationPlacement(settings, {
        pages,
        placement,
        siteContext: siteContextFor(blogUrl)
    });
}
