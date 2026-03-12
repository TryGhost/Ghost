/* eslint-disable no-shadow */

import ContentBox from './components/content-box';
import PopupBox from './components/popup-box';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import i18nLib from '@tryghost/i18n';
import setupGhostApi from './utils/api';
import {ActionHandler, SyncActionHandler, isSyncAction} from './actions';
import {AppContext, Comment, DispatchActionType, EditableAppContext} from './app-context';
import {CommentApiProvider, CommentMember, useCommentApi} from './components/comment-api-provider';
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

/**
 * Apply comment member data to comments — sets `liked` flag on comments
 * the member has liked, based on the member's liked_comments array.
 */
function applyCommentMember(comments: Comment[], commentMember: CommentMember | null): Comment[] {
    if (!commentMember) {
        return comments;
    }
    const likedSet = new Set(commentMember.liked_comments);
    return comments.map((comment) => {
        const liked = likedSet.has(comment.id);
        const replies = comment.replies?.map(reply => ({
            ...reply,
            liked: likedSet.has(reply.id)
        })) ?? [];
        if (liked !== comment.liked || replies !== comment.replies) {
            return {...comment, liked, replies};
        }
        return comment;
    });
}

const AppContent: React.FC<{
    options: ReturnType<typeof useOptions>;
    initialCommentId: string | null;
    pageUrl: string;
}> = ({options, initialCommentId, pageUrl}) => {
    const {publicApi, memberApi, isAdmin, adminActions, member, labs, supportEmail, commentMember, commentMemberLoaded} = useCommentApi();
    const [state, setFullState] = useState<EditableAppContext>({
        initStatus: 'running',
        member: null,
        comments: [],
        pagination: null,
        commentCount: 0,
        openCommentForms: [],
        popup: null,
        labs: {},
        order: 'count__likes desc, created_at desc',
        commentsIsLoading: false,
        commentIdToHighlight: null,
        commentIdToScrollTo: initialCommentId,
        showMissingCommentNotice: false,
        pageUrl,
        supportEmail: null,
        isMember: false,
        isPaidOnly: false,
        hasRequiredTier: true,
        isCommentingDisabled: false
    });

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const commentMemberRef = useRef({data: commentMember, loaded: commentMemberLoaded});
    commentMemberRef.current = {data: commentMember, loaded: commentMemberLoaded};
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
            // Makes sure we correctly handle the old state
            // because updates to state may be asynchronous
            // so calling dispatchAction('counterUp') multiple times, may yield unexpected results if we don't use a callback function
            setState((state) => {
                return SyncActionHandler({action, data, state, options});
            });
            return;
        }

        // This is a bit a ugly hack, but only reliable way to make sure we can get the latest state asynchronously
        // without creating infinite rerenders because dispatchAction needs to change on every state change
        // So state shouldn't be a dependency of dispatchAction
        //
        // Wrapped in a Promise so that callers of `dispatchAction` can await the action completion. setState doesn't
        // allow for async actions within it's updater function so this is the best option.
        return new Promise((resolve) => {
            setState((state) => {
                ActionHandler({action, data, state, publicApi, memberApi, adminActions, options, dispatchAction: dispatchAction as DispatchActionType}).then((updatedState) => {
                    const newState = {...updatedState};
                    resolve(newState);
                    setState(newState);
                }).catch(console.error); // eslint-disable-line no-console

                // No immediate changes
                return {};
            });
        });
    }, [publicApi, memberApi, adminActions, options]); // Do not add state or context as a dependency here -> infinite render loop

    const i18n = useMemo(() => {
        return i18nLib(options.locale, 'comments');
    }, [options.locale]);

    const context = {
        ...options,
        ...state,
        // Override state values with latest from provider (state may have stale values
        // if initSetup ran before settings loaded)
        isAdmin,
        supportEmail,
        labs,
        t: i18n.t,
        dispatchAction: dispatchAction as DispatchActionType,
        openFormCount: useMemo(() => state.openCommentForms.length, [state.openCommentForms])
    };

    /** Fetch first few comments using the public API */
    const fetchComments = async () => {
        const dataPromise = publicApi.browse({page: 1, postId: options.postId, order: state.order});
        const countPromise = publicApi.count({postId: options.postId});

        const [data, count] = await Promise.all([dataPromise, countPromise]);

        return {
            comments: data.comments,
            pagination: data.meta.pagination,
            count: count
        };
    };

    /**
     * Fetch the target comment and verify it exists and is published.
     * Returns null if the comment doesn't exist or isn't accessible.
     */
    const fetchScrollTarget = async (targetId: string): Promise<Comment | null> => {
        try {
            const response = await publicApi.read(targetId);
            const comment = response.comments?.[0];
            return (comment && comment.status === 'published') ? comment : null;
        } catch {
            return null;
        }
    };

    /**
     * Paginate through comments until the target (or its parent) is found.
     */
    const paginateToComment = async (
        targetId: string,
        parentId: string | undefined,
        initialComments: Comment[],
        initialPagination: {page: number; pages: number}
    ): Promise<{comments: Comment[]; pagination: typeof initialPagination}> => {
        let comments = initialComments;
        let pagination = initialPagination;

        while (!isCommentLoaded(comments, targetId) && pagination.page < pagination.pages) {
            if (parentId && comments.some(c => c.id === parentId)) {
                break;
            }

            const nextPage = await publicApi.browse({
                page: pagination.page + 1,
                postId: options.postId,
                order: state.order
            });
            comments = [...comments, ...nextPage.comments];
            pagination = nextPage.meta.pagination;
        }

        return {comments, pagination};
    };

    /**
     * Load additional comment pages and/or replies until the scroll target is found.
     */
    const loadScrollTarget = async (
        targetId: string,
        targetComment: Comment,
        initialComments: Comment[],
        initialPagination: {page: number; pages: number}
    ): Promise<{comments: Comment[]; pagination: typeof initialPagination; found: boolean}> => {
        const parentId = targetComment.parent_id;

        const {comments: paginatedComments, pagination} = await paginateToComment(targetId, parentId, initialComments, initialPagination);
        let comments = paginatedComments;

        if (parentId && !isCommentLoaded(comments, targetId)) {
            const {comments: allReplies} = await publicApi.replies({commentId: parentId, limit: 'all'});
            comments = comments.map(c => (c.id === parentId ? {...c, replies: allReplies} : c));
        }

        return {comments, pagination, found: isCommentLoaded(comments, targetId)};
    };

    /** Initialize comments setup - called after provider is resolved */
    const initSetup = async () => {
        try {
            const {count, comments: initialComments, pagination: initialPagination} = await fetchComments();

            let comments = initialComments;
            let pagination = initialPagination;
            let scrollTargetFound = false;

            const shouldFindScrollTarget = initialCommentId && pagination;
            if (shouldFindScrollTarget) {
                const targetComment = await fetchScrollTarget(initialCommentId);
                if (targetComment) {
                    const result = await loadScrollTarget(initialCommentId, targetComment, comments, pagination);
                    comments = result.comments;
                    pagination = result.pagination;
                    scrollTargetFound = result.found;
                }
            }

            // Read latest comment member from ref (avoids stale closure)
            const currentCommentMember = commentMemberRef.current.data;
            const currentMember = currentCommentMember ? {
                uuid: currentCommentMember.uuid,
                name: currentCommentMember.name,
                expertise: currentCommentMember.expertise,
                avatar_image: currentCommentMember.avatar_image,
                can_comment: currentCommentMember.can_comment,
                paid: currentCommentMember.paid
            } : member;
            const isMember = !!currentMember;
            const isPaidOnly = options.commentsEnabled === 'paid';
            const isPaidMember = !!currentMember?.paid;
            const hasRequiredTier = isPaidMember || !isPaidOnly;

            // Apply comment member liked states if already available
            const overlaidComments = commentMemberRef.current.loaded
                ? applyCommentMember(comments, currentCommentMember)
                : comments;

            setState({
                member: currentMember,
                initStatus: 'success',
                comments: overlaidComments,
                pagination,
                commentCount: count,
                order: 'count__likes desc, created_at desc',
                labs: labs,
                commentsIsLoading: false,
                commentIdToHighlight: null,
                commentIdToScrollTo: scrollTargetFound ? initialCommentId : null,
                showMissingCommentNotice: !!initialCommentId && !scrollTargetFound,
                supportEmail,
                isMember,
                isPaidOnly,
                hasRequiredTier,
                isCommentingDisabled: currentMember?.can_comment === false
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`[Comments] Failed to initialize:`, e);
            setState({
                initStatus: 'failed'
            });
        }
    };

    // Apply comment member data when it arrives — updates liked states on existing comments
    useEffect(() => {
        if (!commentMemberLoaded || state.initStatus !== 'success') {
            return;
        }

        setState((prev) => {
            const updatedComments = applyCommentMember(prev.comments, commentMember);
            const isMember = !!member;
            const isPaidMember = !!member?.paid;
            const isPaidOnly = options.commentsEnabled === 'paid';
            const hasRequiredTier = isPaidMember || !isPaidOnly;

            return {
                member,
                comments: updatedComments,
                isMember,
                isPaidOnly,
                hasRequiredTier,
                isCommentingDisabled: member?.can_comment === false
            };
        });
    }, [commentMemberLoaded, state.initStatus]);

    /** Delay initialization until comments block is in viewport (unless permalink present) */
    useEffect(() => {
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
    }, [iframeRef.current, initialCommentId]);

    const done = state.initStatus === 'success';

    return (
        <AppContext.Provider value={context}>
            <CommentsFrame ref={iframeRef}>
                <ContentBox done={done} />
            </CommentsFrame>
            <PopupBox />
        </AppContext.Provider>
    );
};

const App: React.FC<AppProps> = ({scriptTag, initialCommentId, pageUrl}) => {
    const options = useOptions(scriptTag);

    const api = useMemo(() => {
        return setupGhostApi({
            siteUrl: options.siteUrl,
            apiUrl: options.apiUrl!,
            apiKey: options.apiKey!
        });
    }, [options]);

    return (
        <CommentApiProvider
            adminUrl={options.adminUrl}
            api={api}
            postId={options.postId}
        >
            <AppContent
                initialCommentId={initialCommentId}
                options={options}
                pageUrl={pageUrl}
            />
        </CommentApiProvider>
    );
};

export default App;
