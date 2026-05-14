import CTABox from './cta-box';
import Comment from './comment';
import CommentingDisabledBox from './commenting-disabled-box';
import ContentTitle from './content-title';
import FocusedThread from './focused-thread';
import MainForm from './forms/main-form';
import Pagination from './pagination';
import {DESKTOP_MAX_THREAD_DEPTH, MOBILE_BREAKPOINT, MOBILE_MAX_THREAD_DEPTH, getFocusedThread, parseCommentIdFromHash, scrollToElement, scrollToElementInstantly} from '../../utils/helpers';
import {NavActions, NavActionsContext} from '../../utils/nav-actions';
import {ROOT_DIV_ID} from '../../utils/constants';
import {SortingForm} from './forms/sorting-form';
import {ThreadingContext} from '../../utils/threading-context';
import {useAppContext, useLabs} from '../../app-context';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

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

// Fallback timeout if iframe height doesn't change (content fits exactly)
const IFRAME_RESIZE_TIMEOUT_MS = 500;

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function getCurrentMaxThreadDepth() {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return DESKTOP_MAX_THREAD_DEPTH;
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? MOBILE_MAX_THREAD_DEPTH : DESKTOP_MAX_THREAD_DEPTH;
}

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

const Content = () => {
    const labs = useLabs();
    const {pagination, comments, commentCount, title, showCount, commentsIsLoading, t, dispatchAction, commentIdToScrollTo, commentIdFromHash, showMissingCommentNotice, isMember, isPaidOnly, hasRequiredTier, isCommentingDisabled} = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const focusedThreadViewCommentId = useRef<string | null>(null);
    const instantScrollCommentId = useRef<string | null>(null);
    const [maxThreadDepth, setMaxThreadDepth] = useState(getCurrentMaxThreadDepth);

    const scrollToCommentsTop = useCallback((behavior: ScrollBehavior = 'auto') => {
        const elem = document.getElementById(ROOT_DIV_ID);

        if (!elem) {
            return;
        }

        afterNextLayoutFrame(() => {
            elem.scrollIntoView({behavior, block: 'start'});
        });
    }, []);

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
    }, []);

    useEffect(() => {
        const elem = document.getElementById(ROOT_DIV_ID);

        // Check scroll position
        if (elem && window.location.hash === `#ghost-comments`) {
            // Only scroll if the user didn't scroll by the time we loaded the comments
            // We could remove this, but if the network connection is slow, we risk having a page jump when the user already started scrolling
            if (window.scrollY === 0) {
                afterNextLayoutFrame(() => {
                    elem.scrollIntoView();
                });
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }

        const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
        const updateMaxThreadDepth = () => {
            setMaxThreadDepth(mql.matches ? MOBILE_MAX_THREAD_DEPTH : DESKTOP_MAX_THREAD_DEPTH);
        };

        updateMaxThreadDepth();
        mql.addEventListener('change', updateMaxThreadDepth);
        return () => mql.removeEventListener('change', updateMaxThreadDepth);
    }, []);

    useEffect(() => {
        // Capture the parent window reference once so the handler and cleanup
        // always use the same object. window.parent becomes null when the
        // iframe is detached from the DOM, but the captured reference remains
        // valid for removing the listener.
        const parentWindow = window.parent;
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
    }, [scrollToComment, scrollToCommentInstantly, scrollToCommentsTop]);

    const navActions = useMemo<NavActions>(() => ({
        requestFocusedThreadView: (commentId) => {
            focusedThreadViewCommentId.current = commentId;
        },
        requestInstantScroll: (commentId) => {
            instantScrollCommentId.current = commentId;
        }
    }), []);
    const threadingContext = useMemo(() => ({
        maxThreadDepth
    }), [maxThreadDepth]);

    useEffect(() => {
        if (!commentIdToScrollTo || commentsIsLoading || !containerRef.current) {
            return;
        }

        const parentHashCommentId = parseCommentIdFromHash(window.parent?.location.hash || '');
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
    }, [commentIdToScrollTo, commentIdFromHash, commentsIsLoading, comments, scrollToComment]);

    useEffect(() => {
        if (!showMissingCommentNotice || commentsIsLoading) {
            return;
        }

        const root = document.getElementById(ROOT_DIV_ID);
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
    }, [showMissingCommentNotice, commentsIsLoading]);

    const isFirst = pagination?.total === 0;
    const canComment = isMember && hasRequiredTier && !isCommentingDisabled;

    // Explicit form/box visibility states
    const showMainForm = canComment;
    const showDisabledBox = !canComment && isCommentingDisabled;
    const showCtaBox = !canComment && !isCommentingDisabled;
    const useThreading = !!labs.commentsThreads;
    const focusedThread = useMemo(() => (
        useThreading ? getFocusedThread(comments, commentIdFromHash, maxThreadDepth) : null
    ), [comments, commentIdFromHash, maxThreadDepth, useThreading]);

    const commentsComponents = comments.map(comment => <Comment key={comment.id} comment={comment} useThreading={useThreading} />);

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

    const content = focusedThread ? (
        <>
            <ContentTitle count={commentCount} showCount={showCount} title={title}/>
            <div ref={containerRef} className={`z-10 transition-opacity duration-100 ${commentsIsLoading ? 'opacity-50' : ''}`} data-testid="comment-elements">
                <FocusedThread focusedThread={focusedThread} />
            </div>
        </>
    ) : (
        <>
            <ContentTitle count={commentCount} showCount={showCount} title={title}/>
            {showMissingCommentNotice && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100" data-testid="missing-comment-notice">
                    {t('The linked comment is no longer available.')}
                </div>
            )}
            <div>
                {showMainForm && <MainForm commentsCount={comments.length} />}
                {showDisabledBox && (
                    <section className="flex flex-col items-center py-6 sm:px-8 sm:py-10" data-testid="commenting-disabled-box">
                        <CommentingDisabledBox />
                    </section>
                )}
                {showCtaBox && (
                    <section className="flex flex-col items-center py-6 sm:px-8 sm:py-10" data-testid="cta-box">
                        <CTABox isFirst={isFirst} isPaid={isPaidOnly} />
                    </section>
                )}
            </div>
            {commentCount > 1 && (
                <div className="z-20 mb-7 mt-3">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {t('Sort by')}: <SortingForm/>
                    </span>
                </div>
            )}
            <div ref={containerRef} className={`z-10 transition-opacity duration-100 ${commentsIsLoading ? 'opacity-50' : ''}`} data-testid="comment-elements">
                {commentsComponents}
            </div>
            <Pagination />
            {
                labs?.testFlag ? <div data-testid="this-comes-from-a-flag" style={{display: 'none'}}></div> : null
            }
        </>
    );

    return (
        <NavActionsContext.Provider value={navActions}>
            <ThreadingContext.Provider value={threadingContext}>
                {content}
            </ThreadingContext.Provider>
        </NavActionsContext.Provider>
    );
};

export default Content;
