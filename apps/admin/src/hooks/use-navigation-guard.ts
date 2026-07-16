import React from 'react';
import {useBlocker} from 'react-router';

export interface NavigationGuard {
    /** True while a navigation is waiting on the screen's confirmation. */
    isBlocked: boolean;
    /** Confirm leaving: performs the navigation that was held back. */
    proceed: () => void;
    /** Cancel leaving: drops the navigation that was held back. */
    reset: () => void;
}

/**
 * Holds back navigation away from a screen with unsaved work until it says the
 * navigation may continue.
 *
 * Admin leaves a screen two different ways, and a guard is only complete if it
 * covers both. `useBlocker` covers react-router navigations. It cannot cover
 * native `<a href="#/…">` anchors — the sidebar, the mobile nav bar, anything
 * pointing into an Ember-owned route — because the browser creates that history
 * entry itself, so react-router receives a POP carrying no index of its own and
 * skips its blockers rather than block a location it can't restore. Those are
 * caught by intercepting the click before the browser acts on it.
 *
 * Both paths resolve to one blocked/proceed/reset surface: which one a given
 * navigation took is this hook's business, not the screen's.
 *
 * `isDirty` is called when a navigation is attempted rather than read at
 * render, so a screen can waive the guard for its own post-save redirect
 * without needing a re-render first.
 */
export function useNavigationGuard(isDirty: () => boolean): NavigationGuard {
    const isDirtyRef = React.useRef(isDirty);
    isDirtyRef.current = isDirty;

    const [blockedHref, setBlockedHref] = React.useState<string | null>(null);

    const blocker = useBlocker(React.useCallback(
        ({currentLocation, nextLocation}) => isDirtyRef.current() && currentLocation.pathname !== nextLocation.pathname,
        []
    ));

    React.useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!isDirtyRef.current() || event.defaultPrevented) {
                return;
            }

            // Modified clicks open a new tab or window, which leaves this
            // screen and its unsaved work where they are.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
            }

            const anchor = (event.target as Element).closest?.('a[href^="#/"]');
            if (!anchor) {
                return;
            }

            // react-router stamps the links it renders, and the blocker above
            // already covers those. Interception runs in the capture phase, so
            // it has to tell them apart here: by the time react-router's own
            // click handler would mark the event as handled, this listener has
            // already had to decide.
            if (anchor.hasAttribute('data-discover')) {
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
        isBlocked: blocker.state === 'blocked' || blockedHref !== null,
        proceed: () => {
            if (blockedHref !== null) {
                setBlockedHref(null);
                window.location.hash = blockedHref;
                return;
            }
            blocker.proceed?.();
        },
        reset: () => {
            setBlockedHref(null);
            blocker.reset?.();
        }
    };
}
