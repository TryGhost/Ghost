export function transformPortalAnchorToRelative(anchor) {
    const href = anchor.getAttribute('href');
    const url = new URL(href, window.location.origin);

    // ignore non-portal links
    if (!url.hash || !url.hash.startsWith('#/portal')) {
        return;
    }

    // ignore already-relative links
    if (href.startsWith('#/portal')) {
        return;
    }

    // ignore external links
    if (url.origin !== window.location.origin) {
        return;
    }

    // convert to a relative link
    anchor.setAttribute('href', url.hash);
}
