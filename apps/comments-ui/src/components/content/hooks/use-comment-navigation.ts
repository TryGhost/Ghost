import {MutableRefObject, RefObject, useCallback, useEffect, useMemo, useRef} from 'react';
import {NavActions} from '../../../utils/nav-actions';
import {ROOT_DIV_ID} from '../../../utils/constants';
import {ThreadWindow} from '../../../utils/thread-graph';
import {parseCommentIdFromHash, scrollToElement, scrollToElementInstantly} from '../../../utils/helpers';
import {useAppContext} from '../../../app-context';

/**
 * Find the iframe element that contains the current window, if any.
 * Returns null if not in an iframe or cross-origin.
 */
function findContainingIframe(doc: Document): HTMLIFrameElement | null {
    const currentWindow = doc.defaultView;
    if (!currentWindow?.parent || currentWindow.parent === currentWindow) {
        return null;
    }

    try {
        const iframes = currentWindow.parent.document.getElementsByTagName('iframe');
        for (const iframe of iframes) {
            if (iframe.contentWindow === currentWindow) {
                return iframe;
            }
        }
    } catch {
        // Cross-origin - can't access parent
    }
    return null;
}

const IFRAME_RESIZE_TIMEOUT_MS = 500;

// Comment navigation can swap between focused-thread and main-list views, then
// trigger an iframe resize. Waiting two frames gives React and browser layout a
// chance to settle before we measure or scroll to a target element.
function afterNextLayoutFrame(callback: () => void) {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
}

/**
 * Wait for iframe to resize then call callback (on initial load, iframe starts small).
 * Uses ResizeObserver with a fallback timeout.
 */
function onIframeResize(
    iframe: HTMLIFrameElement,
    callback: () => void
): () => void {
    const initialHeight = iframe.clientHeight;
    let triggered = false;

    const trigger = () => {
        if (triggered) {
            return;
        }
        triggered = true;
        observer.disconnect();
        callback();
    };

    const observer = new ResizeObserver(() => {
        if (iframe.clientHeight !== initialHeight) {
            trigger();
        }
    });
    observer.observe(iframe);

    const timeout = setTimeout(trigger, IFRAME_RESIZE_TIMEOUT_MS);

    return () => {
        clearTimeout(timeout);
        observer.disconnect();
    };
}

type UseCommentNavigationOptions = {
    containerRef: RefObject<HTMLDivElement>;
    focusedThread: ThreadWindow | null;
};

type NavigationHelpers = {
    scrollToCommentInstantly: (commentId: string) => void;
    scrollToComment: (element: HTMLElement, commentId: string, options?: {preserveScrollTarget?: boolean}) => void;
    scrollToCommentsTop: (behavior?: ScrollBehavior) => void;
};

function getRootElement(containerRef: RefObject<HTMLDivElement>): HTMLElement | null {
    const iframeRoot = containerRef.current?.ownerDocument.getElementById(ROOT_DIV_ID);
    return iframeRoot || document.getElementById(ROOT_DIV_ID);
}

function getParentWindow(containerRef: RefObject<HTMLDivElement>): Window | null {
    const currentWindow = containerRef.current?.ownerDocument.defaultView || window;
    return currentWindow.parent || currentWindow;
}

function useNavigationHelpers(containerRef: RefObject<HTMLDivElement>): NavigationHelpers {
    const {dispatchAction} = useAppContext();

    const scrollToCommentsTop = useCallback((behavior: ScrollBehavior = 'auto') => {
        const elem = getRootElement(containerRef);

        if (!elem) {
            return;
        }

        afterNextLayoutFrame(() => {
            elem.scrollIntoView({behavior, block: 'start'});
        });
    }, [containerRef]);

    const scrollToComment = useCallback((element: HTMLElement, commentId: string, options: {preserveScrollTarget?: boolean} = {}) => {
        element.scrollIntoView({behavior: 'smooth', block: 'center'});
        dispatchAction('highlightComment', {commentId});

        if (!options.preserveScrollTarget) {
            dispatchAction('setScrollTarget', null);
        }
    }, [dispatchAction]);

    const scrollToCommentInstantly = useCallback((commentId: string) => {
        afterNextLayoutFrame(() => {
            const element = containerRef.current?.ownerDocument.getElementById(commentId);
            if (element) {
                const iframe = findContainingIframe(element.ownerDocument);
                if (iframe) {
                    onIframeResize(iframe, () => {
                        scrollToElementInstantly(element);
                    });
                    return;
                }

                scrollToElementInstantly(element);
            }
        });
    }, [containerRef]);

    return {
        scrollToComment,
        scrollToCommentInstantly,
        scrollToCommentsTop
    };
}

function useInitialCommentsRootScroll(containerRef: RefObject<HTMLDivElement>) {
    useEffect(() => {
        const elem = getRootElement(containerRef);
        const parentWindow = getParentWindow(containerRef);

        // Check scroll position
        if (elem && parentWindow?.location.hash === `#ghost-comments`) {
            // Only scroll if the user didn't scroll by the time we loaded the comments
            // We could remove this, but if the network connection is slow, we risk having a page jump when the user already started scrolling
            if (parentWindow.scrollY === 0) {
                afterNextLayoutFrame(() => {
                    elem.scrollIntoView();
                });
            }
        }
    }, [containerRef]);
}

function useHashChangeNavigation(
    containerRef: RefObject<HTMLDivElement>,
    focusedThreadViewCommentId: MutableRefObject<string | null>,
    instantScrollCommentId: MutableRefObject<string | null>,
    helpers: NavigationHelpers
) {
    const {dispatchAction} = useAppContext();
    const {scrollToComment, scrollToCommentInstantly, scrollToCommentsTop} = helpers;
    useEffect(() => {
        // Capture the parent window reference once so the handler and cleanup
        // always use the same object. window.parent becomes null when the
        // iframe is detached from the DOM, but the captured reference remains
        // valid for removing the listener.
        const parentWindow = getParentWindow(containerRef);
        if (!parentWindow) {
            return;
        }

        const handleHashChange = () => {
            const hash = parentWindow.location.hash;
            const commentId = parseCommentIdFromHash(hash);
            if (commentId && containerRef.current) {
                const opensFocusedThreadView = focusedThreadViewCommentId.current === commentId;
                const instantScroll = instantScrollCommentId.current === commentId;
                focusedThreadViewCommentId.current = null;
                instantScrollCommentId.current = null;
                dispatchAction('setHashCommentId', commentId);

                if (opensFocusedThreadView) {
                    dispatchAction('setScrollTarget', null);
                    dispatchAction('setHighlightComment', null);
                    scrollToCommentsTop();
                    return;
                }

                if (instantScroll) {
                    dispatchAction('setScrollTarget', null);
                    dispatchAction('setHighlightComment', null);
                    scrollToCommentInstantly(commentId);
                    return;
                }

                dispatchAction('setScrollTarget', commentId);
                const doc = containerRef.current.ownerDocument;
                const element = doc.getElementById(commentId);
                if (element) {
                    scrollToComment(element, commentId, {preserveScrollTarget: true});
                }
            } else {
                focusedThreadViewCommentId.current = null;
                instantScrollCommentId.current = null;
                dispatchAction('setHashCommentId', null);
                dispatchAction('setScrollTarget', null);
                dispatchAction('setHighlightComment', null);

                if (hash === '#ghost-comments') {
                    scrollToCommentsTop('smooth');
                }
            }
        };

        parentWindow.addEventListener('hashchange', handleHashChange);
        return () => parentWindow.removeEventListener('hashchange', handleHashChange);
    }, [containerRef, dispatchAction, scrollToComment, scrollToCommentInstantly, scrollToCommentsTop]);
}

function useScrollToHashTarget(
    containerRef: RefObject<HTMLDivElement>,
    helpers: NavigationHelpers
) {
    const {comments, commentsIsLoading, commentIdFromHash, commentIdToScrollTo, dispatchAction} = useAppContext();
    const {scrollToComment} = helpers;

    useEffect(() => {
        if (!commentIdToScrollTo || commentsIsLoading || !containerRef.current) {
            return;
        }

        const parentWindow = getParentWindow(containerRef);
        const parentHashCommentId = parseCommentIdFromHash(parentWindow?.location.hash || '');
        if (parentHashCommentId === commentIdToScrollTo && commentIdFromHash !== commentIdToScrollTo) {
            dispatchAction('setHashCommentId', commentIdToScrollTo);
            return;
        }

        const doc = containerRef.current.ownerDocument;
        const element = doc.getElementById(commentIdToScrollTo);
        if (!element) {
            return;
        }

        const iframe = findContainingIframe(doc);
        if (iframe) {
            return onIframeResize(iframe, () => {
                scrollToComment(element, commentIdToScrollTo, {preserveScrollTarget: commentIdToScrollTo === commentIdFromHash});
            });
        }

        scrollToComment(element, commentIdToScrollTo, {preserveScrollTarget: commentIdToScrollTo === commentIdFromHash});
    }, [commentIdToScrollTo, commentIdFromHash, commentsIsLoading, comments, containerRef, dispatchAction, scrollToComment]);
}

function useScrollToMissingCommentNotice(containerRef: RefObject<HTMLDivElement>) {
    const {commentsIsLoading, showMissingCommentNotice} = useAppContext();

    useEffect(() => {
        if (!showMissingCommentNotice || commentsIsLoading) {
            return;
        }

        const root = getRootElement(containerRef);
        if (!root) {
            return;
        }

        const iframe = findContainingIframe(root.ownerDocument);
        if (iframe) {
            return onIframeResize(iframe, () => {
                scrollToElement(root);
            });
        }

        scrollToElement(root);
    }, [containerRef, showMissingCommentNotice, commentsIsLoading]);
}

function useBackToParentScroll(
    focusedThread: ThreadWindow | null,
    instantScrollCommentId: MutableRefObject<string | null>,
    helpers: NavigationHelpers
) {
    const {commentIdFromHash} = useAppContext();
    const {scrollToCommentInstantly} = helpers;

    useEffect(() => {
        // Handles the "Back to parent" link case: history.pushState updates the URL
        // without firing hashchange, so we scroll the now-rendered comment into view
        // after the focused thread collapses back to the main list.
        if (!commentIdFromHash || focusedThread || instantScrollCommentId.current !== commentIdFromHash) {
            return;
        }

        instantScrollCommentId.current = null;
        scrollToCommentInstantly(commentIdFromHash);
    }, [commentIdFromHash, focusedThread, scrollToCommentInstantly]);
}

export function useCommentNavigation({
    containerRef,
    focusedThread
}: UseCommentNavigationOptions): NavActions {
    const {dispatchAction} = useAppContext();
    const focusedThreadViewCommentId = useRef<string | null>(null);
    const instantScrollCommentId = useRef<string | null>(null);
    const helpers = useNavigationHelpers(containerRef);

    useInitialCommentsRootScroll(containerRef);
    useHashChangeNavigation(containerRef, focusedThreadViewCommentId, instantScrollCommentId, helpers);
    useScrollToHashTarget(containerRef, helpers);
    useScrollToMissingCommentNotice(containerRef);
    useBackToParentScroll(focusedThread, instantScrollCommentId, helpers);

    return useMemo<NavActions>(() => ({
        requestFocusedThreadView: (commentId) => {
            focusedThreadViewCommentId.current = commentId;
        },
        requestInstantScroll: (commentId) => {
            instantScrollCommentId.current = commentId;
        },
        navigateBackToParent: (commentId, permalink) => {
            instantScrollCommentId.current = commentId;
            getParentWindow(containerRef)?.history.pushState(null, '', permalink);
            dispatchAction('setHashCommentId', commentId);
            dispatchAction('setScrollTarget', null);
            dispatchAction('setHighlightComment', null);
        }
    }), [containerRef, dispatchAction]);
}
