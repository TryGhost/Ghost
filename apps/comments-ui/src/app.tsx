/* eslint-disable no-shadow */

import AuthFrame from './auth-frame';
import ContentBox from './components/content-box';
import PopupBox from './components/popup-box';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import i18nLib from '@tryghost/i18n';
import setupGhostApi from './utils/api';
import {ActionHandler, SyncActionHandler, isSyncAction} from './actions';
import {AppContext, Comment, DispatchActionType, EditableAppContext} from './app-context';
import {CommentsFrame} from './components/frame';
import {setupAdminAPI} from './utils/admin-api';
import {useOptions} from './utils/options';

type AppProps = {
    scriptTag: HTMLElement;
    initialCommentId: string | null;
    pageUrl: string;
};

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

/**
 * Check if a comment ID exists in the comments array (either as a top-level comment or reply)
 */
function isCommentLoaded(comments: Comment[], targetId: string): boolean {
    return comments.some(c => c.id === targetId || c.replies?.some(r => r.id === targetId));
}

const App: React.FC<AppProps> = ({scriptTag, initialCommentId, pageUrl}) => {
    const options = useOptions(scriptTag);
    const [state, setFullState] = useState<EditableAppContext>({
        initStatus: 'running',
        member: null,
        admin: null,
        comments: [],
        pagination: null,
        commentCount: 0,
        openCommentForms: [],
        popup: null,
        labs: {},
        order: 'count__likes desc, created_at desc',
        adminApi: null,
        commentsIsLoading: false,
        commentIdToHighlight: null,
        commentIdToScrollTo: initialCommentId,
        showMissingCommentNotice: false,
        pageUrl,
        supportEmail: null,
        isMember: false,
        isAdmin: false,
        isPaidOnly: false,
        hasRequiredTier: true,
        isCommentingDisabled: false
    });

    const iframeRef = React.createRef<HTMLIFrameElement>();

    const api = React.useMemo(() => {
        return setupGhostApi({
            siteUrl: options.siteUrl,
            apiUrl: options.apiUrl!,
            apiKey: options.apiKey!
        });
    }, [options]);

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
                return SyncActionHandler({action, data, state, api, adminApi: state.adminApi!, options});
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
                ActionHandler({action, data, state, api, adminApi: state.adminApi!, options, dispatchAction: dispatchAction as DispatchActionType}).then((updatedState) => {
                    const newState = {...updatedState};
                    resolve(newState);
                    setState(newState);
                }).catch(console.error); // eslint-disable-line no-console

                // No immediate changes
                return {};
            });
        });
    }, [api, options]); // Do not add state or context as a dependency here -> infinite render loop

    const i18n = useMemo(() => {
        return i18nLib(options.locale, 'comments');
    }, [options.locale]);

    const context = {
        ...options,
        ...state,
        t: i18n.t,
        dispatchAction: dispatchAction as DispatchActionType,
        openFormCount: useMemo(() => state.openCommentForms.length, [state.openCommentForms])
    };

    const initAdminAuth = async () => {
        if (state.adminApi || !options.adminUrl) {
            return;
        }

        try {
            const adminApi = setupAdminAPI({
                adminUrl: options.adminUrl
            });

            let admin = null;
            try {
                admin = await adminApi.getUser();

                // remove 'admin' for any roles (author, contributor, editor) who can't moderate comments
                if (!admin || !(admin.roles.some(role => ALLOWED_MODERATORS.includes(role.name)))) {
                    admin = null;
                }

                if (admin) {
                    // this is a bit of a hack, but we need to fetch the comments fully populated if the user is an admin
                    const adminComments = await adminApi.browse({page: 1, postId: options.postId, order: state.order, memberUuid: state.member?.uuid});
                    setState((currentState) => {
                        // Don't overwrite comments when initSetup loaded extra data
                        // for permalink scrolling (multiple pages or expanded replies)
                        if ((currentState.pagination && currentState.pagination.page > 1) || initialCommentId) {
                            return {
                                adminApi,
                                admin,
                                isAdmin: true
                            };
                        }
                        return {
                            adminApi,
                            admin,
                            isAdmin: true,
                            comments: adminComments.comments,
                            pagination: adminComments.meta.pagination
                        };
                    });
                }
            } catch (e) {
                // Loading of admin failed. Could be not signed in, or a different error (not important)
                // eslint-disable-next-line no-console
                console.warn(`[Comments] Failed to fetch admin endpoint:`, e);
            }

            setState({
                adminApi,
                admin,
                isAdmin: !!admin
            });
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Comments] Failed to initialize admin authentication:`, e);
        }
    };

    /** Fetch first few comments  */
    const fetchComments = async () => {
        const dataPromise = api.comments.browse({page: 1, postId: options.postId, order: state.order});
        const countPromise = api.comments.count({postId: options.postId});

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
            const response = await api.comments.read(targetId);
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

            const nextPage = await api.comments.browse({
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
     * Load all replies for a parent comment if the target reply isn't already loaded.
     */
    const loadRepliesForComment = async (
        parentId: string,
        comments: Comment[]
    ): Promise<Comment[]> => {
        const parent = comments.find(c => c.id === parentId);
        const hasMoreReplies = parent && parent.count.replies > parent.replies.length;

        if (!hasMoreReplies) {
            return comments;
        }

        let allReplies: Comment[] = [];
        let hasMore = true;
        let afterReplyId: string | undefined;

        while (hasMore) {
            const response = await api.comments.replies({
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
            comments = await loadRepliesForComment(parentId, comments);
        }

        return {comments, pagination, found: isCommentLoaded(comments, targetId)};
    };

    /** Initialize comments setup once in viewport, fetch data and setup state */
    const initSetup = async () => {
        try {
            const {member, labs, supportEmail} = await api.init();
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
                labs: labs,
                commentsIsLoading: false,
                commentIdToHighlight: null,
                commentIdToScrollTo: scrollTargetFound ? initialCommentId : null,
                showMissingCommentNotice: !!initialCommentId && !scrollTargetFound,
                supportEmail,
                isMember,
                isPaidOnly,
                hasRequiredTier,
                isCommentingDisabled: member?.can_comment === false
            });
        } catch (e) {
            console.error(`[Comments] Failed to initialize:`, e);
            /* eslint-enable no-console */
            setState({
                initStatus: 'failed'
            });
        }
    };

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
            {state.comments.length > 0 ? <AuthFrame adminUrl={options.adminUrl} onLoad={initAdminAuth}/> : null}
            <PopupBox />
        </AppContext.Provider>
    );
};

export default App;
