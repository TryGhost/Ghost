/* eslint-disable no-shadow */

import AuthFrame from './auth-frame';
import ContentBox from './components/content-box';
import PopupBox from './components/popup-box';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import setupGhostApi from './utils/api';
import {ActionHandler, SyncActionHandler, isSyncAction} from './actions';
import {AppContext, Comment, DispatchActionType, EditableAppContext} from './app-context';
import {CommentsFrame} from './components/frame';
import {setupAdminAPI} from './utils/admin-api';

// Simple inline translations for comments (TODO: integrate with i18n properly later)
const translations: Record<string, Record<string, string>> = {
    en: {
        'Add context to your comment': 'Add context to your comment',
        'Add your expertise': 'Add your expertise',
        'Add expertise': 'Add expertise',
        'Cancel': 'Cancel',
        'Comment': 'Comment',
        'Complete your profile': 'Complete your profile',
        'Copy link': 'Copy link',
        'Delete': 'Delete',
        'Deleted member': 'Deleted member',
        'Edit': 'Edit',
        'Edit this comment': 'Edit this comment',
        'Edited': 'Edited',
        'Enter your name': 'Enter your name',
        'Expertise': 'Expertise',
        'Hide': 'Hide',
        'Hide comment': 'Hide comment',
        'Join the discussion': 'Join the discussion',
        'Leave a comment': 'Leave a comment',
        'Leave a reply': 'Leave a reply',
        'Link copied to clipboard': 'Link copied to clipboard',
        'More': 'More',
        'Name': 'Name',
        'One comment': 'One comment',
        'Reply': 'Reply',
        'Reply to comment': 'Reply to comment',
        'Report': 'Report',
        'Report comment': 'Report comment',
        'Report this comment': 'Report this comment',
        'Report this comment?': 'Report this comment?',
        'Save': 'Save',
        'Send': 'Send',
        'Show': 'Show',
        'Show comment': 'Show comment',
        'Show {{amount}} more replies': 'Show {{amount}} more replies',
        'Show {{amount}} previous comments': 'Show {{amount}} previous comments',
        'Show 1 more reply': 'Show 1 more reply',
        'Show 1 previous comment': 'Show 1 previous comment',
        'Sign in': 'Sign in',
        'Sign up': 'Sign up',
        'Start the conversation': 'Start the conversation',
        'This comment has been hidden': 'This comment has been hidden',
        'This comment has been removed': 'This comment has been removed',
        'Upgrade': 'Upgrade',
        'Upgrade to continue': 'Upgrade to continue',
        'View replies': 'View replies',
        'What do you think?': 'What do you think?',
        'Write a comment': 'Write a comment',
        'Write a reply': 'Write a reply',
        'You': 'You',
        'Your comment has been hidden': 'Your comment has been hidden',
        'comments': 'comments',
        '{{amount}} comments': '{{amount}} comments'
    }
};

function createI18n(locale: string) {
    const localeData = translations[locale] || translations.en;
    const t = (key: string, replacements?: Record<string, string | number>) => {
        let result = localeData[key] || translations.en[key] || key;
        if (replacements) {
            Object.entries(replacements).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }
        return result;
    };
    return {t};
}

export type AppOptions = {
    siteUrl: string;
    apiKey?: string;
    apiUrl: string;
    postId: string;
    adminUrl?: string;
    colorScheme: string;
    avatarSaturation: number;
    accentColor: string;
    commentsEnabled: string;
    publication: string;
    locale: string;
    title: string | null;
    showCount: boolean;
    inlineStyles?: string;
};

type AppProps = {
    scriptTag: HTMLElement | null;
    initialCommentId: string | null;
    pageUrl: string;
    options: AppOptions;
};

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

/**
 * Check if a comment ID exists in the comments array (either as a top-level comment or reply)
 */
function isCommentLoaded(comments: Comment[], targetId: string): boolean {
    return comments.some(c => c.id === targetId || c.replies?.some(r => r.id === targetId));
}

const App: React.FC<AppProps> = ({scriptTag, initialCommentId, pageUrl, options}) => {
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
            apiUrl: options.apiUrl,
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
            setState((state) => {
                return SyncActionHandler({action, data, state, api, adminApi: state.adminApi!, options});
            });
            return;
        }

        return new Promise((resolve) => {
            setState((state) => {
                ActionHandler({action, data, state, api, adminApi: state.adminApi!, options, dispatchAction: dispatchAction as DispatchActionType}).then((updatedState) => {
                    const newState = {...updatedState};
                    resolve(newState);
                    setState(newState);
                }).catch(console.error);

                return {};
            });
        });
    }, [api, options]);

    const i18n = useMemo(() => {
        return createI18n(options.locale);
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

                if (!admin || !(admin.roles.some(role => ALLOWED_MODERATORS.includes(role.name)))) {
                    admin = null;
                }

                if (admin) {
                    const adminComments = await adminApi.browse({page: 1, postId: options.postId, order: state.order, memberUuid: state.member?.uuid});
                    setState((currentState) => {
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
                console.warn(`[Comments] Failed to fetch admin endpoint:`, e);
            }

            setState({
                adminApi,
                admin,
                isAdmin: !!admin
            });
        } catch (e) {
            console.error(`[Comments] Failed to initialize admin authentication:`, e);
        }
    };

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

    const fetchScrollTarget = async (targetId: string): Promise<Comment | null> => {
        try {
            const response = await api.comments.read(targetId);
            const comment = response.comments?.[0];
            return (comment && comment.status === 'published') ? comment : null;
        } catch {
            return null;
        }
    };

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

    const initSetup = async () => {
        try {
            const {member, labs, supportEmail} = await api.init();
            const {count, comments: initialComments, pagination: initialPagination} = await fetchComments();

            let comments = initialComments;
            let pagination = initialPagination;
            let scrollTargetFound = false;

            const shouldFindScrollTarget = labs?.commentPermalinks && initialCommentId && pagination;
            if (shouldFindScrollTarget) {
                const targetComment = await fetchScrollTarget(initialCommentId);
                if (targetComment) {
                    const result = await loadScrollTarget(initialCommentId, targetComment, comments, pagination);
                    comments = result.comments;
                    pagination = result.pagination;
                    scrollTargetFound = result.found;
                }
            }

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
                supportEmail,
                isMember,
                isPaidOnly,
                hasRequiredTier,
                isCommentingDisabled: member?.can_comment === false
            });
        } catch (e) {
            console.error(`[Comments] Failed to initialize:`, e);
            setState({
                initStatus: 'failed'
            });
        }
    };

    useEffect(() => {
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
