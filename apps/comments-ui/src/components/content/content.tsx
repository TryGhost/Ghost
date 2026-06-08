import CTABox from './cta-box';
import Comment from './comment';
import CommentingDisabledBox from './commenting-disabled-box';
import ContentTitle from './content-title';
import FocusedThread from './focused-thread';
import MainForm from './forms/main-form';
import Pagination from './pagination';
import {DESKTOP_MAX_THREAD_DEPTH, MOBILE_BREAKPOINT, MOBILE_MAX_THREAD_DEPTH} from '../../utils/helpers';
import {NavActionsContext} from '../../utils/nav-actions';
import {SortingForm} from './forms/sorting-form';
import {ThreadingContext} from '../../utils/threading-context';
import {getFocusedThread} from '../../utils/thread-graph';
import {useAppContext, useLabs} from '../../app-context';
import {useCommentNavigation} from './hooks/use-comment-navigation';
import {useEffect, useMemo, useRef, useState} from 'react';

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function getCurrentMaxThreadDepth() {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return DESKTOP_MAX_THREAD_DEPTH;
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? MOBILE_MAX_THREAD_DEPTH : DESKTOP_MAX_THREAD_DEPTH;
}

const Content = () => {
    const labs = useLabs();
    const {pagination, comments, commentCount, title, showCount, commentsIsLoading, t, commentIdFromHash, showMissingCommentNotice, isMember, isPaidOnly, hasRequiredTier, isCommentingDisabled} = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [maxThreadDepth, setMaxThreadDepth] = useState(() => getCurrentMaxThreadDepth());

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

    const threadingContext = useMemo(() => ({
        maxThreadDepth
    }), [maxThreadDepth]);

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

    const navActions = useCommentNavigation({
        containerRef,
        focusedThread
    });

    const commentsComponents = comments.map(comment => <Comment key={comment.id} comment={comment} useThreading={useThreading} />);

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
