import CTABox from './cta-box';
import Comment from './comment';
import CommentingDisabledBox from './commenting-disabled-box';
import ContentTitle from './content-title';
import MainForm from './forms/main-form';
import Pagination from './pagination';
import {ROOT_DIV_ID} from '../../utils/constants';
import {SortingForm} from './forms/sorting-form';
import {parseCommentIdFromHash, scrollToElement} from '../../utils/helpers';
import {useAppContext, useLabs} from '../../app-context';
import {useCallback, useEffect, useRef} from 'react';

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
    const {pagination, comments, commentCount, title, showCount, commentsIsLoading, t, dispatchAction, commentIdToScrollTo, showMissingCommentNotice, isMember, isPaidOnly, hasRequiredTier, isCommentingDisabled} = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToComment = useCallback((element: HTMLElement, commentId: string) => {
        element.scrollIntoView({behavior: 'smooth', block: 'center'});
        dispatchAction('highlightComment', {commentId});
        dispatchAction('setScrollTarget', null);
    }, [dispatchAction]);

    useEffect(() => {
        const elem = document.getElementById(ROOT_DIV_ID);

        // Check scroll position
        if (elem && window.location.hash === `#ghost-comments`) {
            // Only scroll if the user didn't scroll by the time we loaded the comments
            // We could remove this, but if the network connection is slow, we risk having a page jump when the user already started scrolling
            if (window.scrollY === 0) {
                // This is a bit hacky, but one animation frame is not enough to wait for the iframe height to have changed and the DOM to be updated correctly before scrolling
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        elem.scrollIntoView();
                    });
                });
            }
        }
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
            const commentId = parseCommentIdFromHash(parentWindow.location.hash);
            if (commentId && containerRef.current) {
                const doc = containerRef.current.ownerDocument;
                const element = doc.getElementById(commentId);
                if (element) {
                    scrollToComment(element, commentId);
                }
            }
        };

        parentWindow.addEventListener('hashchange', handleHashChange);
        return () => parentWindow.removeEventListener('hashchange', handleHashChange);
    }, [scrollToComment]);

    useEffect(() => {
        if (!commentIdToScrollTo || commentsIsLoading || !containerRef.current) {
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
                scrollToComment(element, commentIdToScrollTo);
            });
        }

        scrollToComment(element, commentIdToScrollTo);
    }, [commentIdToScrollTo, commentsIsLoading, comments, scrollToComment]);

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

    const commentsComponents = comments.map(comment => <Comment key={comment.id} comment={comment} />);

    return (
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
};

export default Content;
