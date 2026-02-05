/* eslint-disable no-shadow */

import ContentBox from './components/content-box';
import PopupBox from './components/popup-box';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import i18nLib from '@tryghost/i18n';
import setupGhostApi from './utils/api';
import {ActionHandler, SyncActionHandler, isSyncAction} from './actions';
import {AdminActionsProvider} from './components/admin-actions';
import {AppContext, Comment, DispatchActionType, EditableAppContext} from './app-context';
import {type CommentApi, CommentApiProvider, useCommentApi} from './components/comment-api-provider';
import {CommentsFrame} from './components/frame';
import {useOptions} from './utils/options';

type AppProps = {
    scriptTag: HTMLElement;
    initialCommentId: string | null;
    pageUrl: string;
};

/**
 * Check if a comment ID exists in the comments array (either as a top-level comment or reply)
 */
function isCommentLoaded(comments: Comment[], targetId: string): boolean {
    return comments.some(c => c.id === targetId || c.replies?.some(r => r.id === targetId));
}

async function fetchScrollTarget(commentApi: CommentApi, targetId: string): Promise<Comment | null> {
    try {
        const response = await commentApi.read(targetId);
        const comment = response.comments?.[0];
        return (comment && comment.status === 'published') ? comment : null;
    } catch {
        return null;
    }
}

async function paginateToComment(
    commentApi: CommentApi,
    targetId: string,
    parentId: string | undefined,
    initialComments: Comment[],
    initialPagination: {page: number; pages: number},
    postId: string,
    order: string
): Promise<{comments: Comment[]; pagination: typeof initialPagination}> {
    let comments = initialComments;
    let pagination = initialPagination;

    while (!isCommentLoaded(comments, targetId) && pagination.page < pagination.pages) {
        if (parentId && comments.some(c => c.id === parentId)) {
            break;
        }

        const nextPage = await commentApi.browse({
            page: pagination.page + 1,
            postId,
            order
        });
        comments = [...comments, ...nextPage.comments];
        pagination = nextPage.meta.pagination;
    }

    return {comments, pagination};
}

async function loadRepliesForComment(
    commentApi: CommentApi,
    parentId: string,
    comments: Comment[]
): Promise<Comment[]> {
    const parent = comments.find(c => c.id === parentId);
    const hasMoreReplies = parent && parent.count.replies > parent.replies.length;

    if (!hasMoreReplies) {
        return comments;
    }

    let allReplies: Comment[] = [];
    let hasMore = true;
    let afterReplyId: string | undefined;

    while (hasMore) {
        const response = await commentApi.replies({
            commentId: parentId,
            afterReplyId,
            limit: 100
        });
        allReplies = [...allReplies, ...response.comments];
        hasMore = !!response.meta?.pagination?.next;

        if (response.comments.length > 0) {
            afterReplyId = response.comments[response.comments.length - 1]?.id;
        } else {
            hasMore = false;
        }
    }

    return comments.map(c => (c.id === parentId
        ? {...c, replies: allReplies}
        : c
    ));
}

async function loadScrollTarget(
    commentApi: CommentApi,
    targetId: string,
    targetComment: Comment,
    initialComments: Comment[],
    initialPagination: {page: number; pages: number},
    postId: string,
    order: string
): Promise<{comments: Comment[]; pagination: typeof initialPagination; found: boolean}> {
    const parentId = targetComment.parent_id;

    const {comments: paginatedComments, pagination} = await paginateToComment(commentApi, targetId, parentId, initialComments, initialPagination, postId, order);
    let comments = paginatedComments;

    if (parentId && !isCommentLoaded(comments, targetId)) {
        comments = await loadRepliesForComment(commentApi, parentId, comments);
    }

    return {comments, pagination, found: isCommentLoaded(comments, targetId)};
}

const App: React.FC<AppProps> = ({scriptTag, initialCommentId, pageUrl}) => {
    const options = useOptions(scriptTag);

    const api = React.useMemo(() => {
        return setupGhostApi({
            siteUrl: options.siteUrl,
            apiUrl: options.apiUrl!,
            apiKey: options.apiKey!
        });
    }, [options]);

    return (
        <CommentApiProvider adminUrl={options.adminUrl} api={api}>
            <AppInner initialCommentId={initialCommentId} pageUrl={pageUrl} scriptTag={scriptTag} />
        </CommentApiProvider>
    );
};

const AppInner: React.FC<AppProps> = ({scriptTag, initialCommentId, pageUrl}) => {
    const options = useOptions(scriptTag);
    const {resolved, commentApi, member, labs, supportEmail} = useCommentApi();

    const [state, setFullState] = useState<EditableAppContext>({
        initStatus: 'running',
        member: null,
        comments: [],
        pagination: null,
        commentCount: 0,
        openCommentForms: [],
        popup: null,
        order: 'count__likes desc, created_at desc',
        commentsIsLoading: false,
        commentIdToHighlight: null,
        commentIdToScrollTo: initialCommentId,
        pageUrl,
        isMember: false,
        isPaidOnly: false,
        hasRequiredTier: true,
        isCommentingDisabled: false
    });

    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const setState = useCallback((newState: Partial<EditableAppContext> | ((state: EditableAppContext) => Partial<EditableAppContext>)) => {
        setFullState((state) => {
            if (typeof newState === 'function') {
                newState = newState(state);
            }
            return {
                ...state,
                ...newState
            };
        });
    }, [setFullState]);

    const dispatchAction = useCallback(async (action, data) => {
        if (isSyncAction(action)) {
            setState((state) => {
                return SyncActionHandler({action, data, state});
            });
            return;
        }

        return new Promise((resolve) => {
            setState((state) => {
                ActionHandler({action, data, state, commentApi: commentApi!, options, dispatchAction: dispatchAction as DispatchActionType}).then((updatedState) => {
                    const newState = {...updatedState};
                    resolve(newState);
                    setState(newState);
                }).catch(console.error); // eslint-disable-line no-console

                // No immediate changes
                return {};
            });
        });
    }, [commentApi, options]); // Do not add state or context as a dependency here -> infinite render loop

    const i18n = useMemo(() => {
        return i18nLib(options.locale, 'comments');
    }, [options.locale]);

    const context = {
        ...options,
        ...state,
        isAdmin: commentApi?.isAdmin ?? false,
        commentApi,
        labs,
        supportEmail,
        t: i18n.t,
        dispatchAction: dispatchAction as DispatchActionType,
        openFormCount: useMemo(() => state.openCommentForms.length, [state.openCommentForms])
    };

    /** Initialize comments setup once in viewport, fetch data and setup state */
    const initSetup = async () => {
        if (!commentApi) {
            return;
        }

        try {
            const dataPromise = commentApi.browse({page: 1, postId: options.postId, order: state.order});
            const countPromise = commentApi.count({postId: options.postId});
            const [data, count] = await Promise.all([dataPromise, countPromise]);

            let comments = data.comments;
            let pagination = data.meta.pagination;
            let scrollTargetFound = false;

            const shouldFindScrollTarget = labs?.commentPermalinks && initialCommentId && pagination;
            if (shouldFindScrollTarget) {
                const targetComment = await fetchScrollTarget(commentApi, initialCommentId);
                if (targetComment) {
                    const result = await loadScrollTarget(commentApi, initialCommentId, targetComment, comments, pagination, options.postId, state.order);
                    comments = result.comments;
                    pagination = result.pagination;
                    scrollTargetFound = result.found;
                }
            }

            // Compute tier access values
            const isMember = !!member;
            const isPaidOnly = options.commentsEnabled === 'paid';
            const isPaidMember = !!member?.paid;
            const hasRequiredTier = isPaidMember || !isPaidOnly;

            setState({
                member,
                initStatus: 'success',
                comments,
                pagination,
                commentCount: count,
                order: 'count__likes desc, created_at desc',
                commentsIsLoading: false,
                commentIdToHighlight: null,
                commentIdToScrollTo: scrollTargetFound ? initialCommentId : null,
                isMember,
                isPaidOnly,
                hasRequiredTier,
                isCommentingDisabled: member?.can_comment === false
            });
        } catch (e) {
            console.error(`[Comments] Failed to initialize:`, e); // eslint-disable-line no-console
            setState({
                initStatus: 'failed'
            });
        }
    };

    /** Delay initialization until provider resolved + comments block is in viewport (unless permalink present) */
    useEffect(() => {
        if (!resolved || !commentApi) {
            return;
        }

        // If we have a permalink, load immediately (skip lazy loading)
        if (initialCommentId) {
            initSetup();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    initSetup();
                    if (iframeRef.current) {
                        observer.unobserve(iframeRef.current);
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        });

        if (iframeRef.current) {
            observer.observe(iframeRef.current);
        }

        return () => {
            if (iframeRef.current) {
                observer.unobserve(iframeRef.current);
            }
        };
    }, [resolved, commentApi, initialCommentId]);

    const done = state.initStatus === 'success';

    const content = (
        <>
            <CommentsFrame ref={iframeRef}>
                <ContentBox done={done} />
            </CommentsFrame>
            <PopupBox />
        </>
    );

    return (
        <AppContext.Provider value={context}>
            <AdminActionsProvider commentApi={commentApi} setState={setState}>
                {content}
            </AdminActionsProvider>
        </AppContext.Provider>
    );
};

export default App;
