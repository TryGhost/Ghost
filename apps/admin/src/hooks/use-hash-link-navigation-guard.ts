import React from 'react';

/**
 * Guards navigations that bypass react-router: plain `<a href="#/…">` anchors
 * (the admin sidebar, links into Ember-owned routes). Those clicks create a
 * browser-native history entry that reaches react-router as an untracked POP,
 * which `useBlocker` cannot intercept — so without this, a dirty screen is
 * silently abandoned.
 *
 * Ports Ember's proven approach 1:1 (`ghost/admin/app/initializers/trailing-hash.js`):
 * a capture-phase document click listener that, while `when` is true,
 * intercepts unmodified left-clicks on hash anchors and hands the target href
 * back to the caller to confirm. Links rendered by react-router (marked with
 * `data-discover`) are left alone — the router's own blocker guards those.
 */
export function useHashLinkNavigationGuard(when: boolean) {
    const [blockedHref, setBlockedHref] = React.useState<string | null>(null);
    const whenRef = React.useRef(when);
    whenRef.current = when;

    React.useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!whenRef.current || event.defaultPrevented) {
                return;
            }
            // Preserve new-tab/new-window behavior for modified clicks,
            // matching the Ember handler.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
            }
            const anchor = (event.target as Element).closest?.('a[href^="#/"]');
            if (!anchor || anchor.hasAttribute('data-discover')) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            setBlockedHref(anchor.getAttribute('href'));
        };

        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    return {
        blockedHref,
        isBlocked: blockedHref !== null,
        /** Confirm leaving: performs the intercepted navigation for real. */
        proceed: () => {
            if (blockedHref) {
                setBlockedHref(null);
                window.location.hash = blockedHref;
            }
        },
        /** Cancel leaving: drops the intercepted navigation. */
        reset: () => setBlockedHref(null)
    };
}
