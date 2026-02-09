import {AddComment, Comment, CommentsOptions, DispatchActionType, EditableAppContext, OpenCommentForm} from './app-context';
import {AdminApi} from './utils/admin-api';
import {GhostApi} from './utils/api';
import {Page} from './pages';
import {commentKeys, queryClient} from './utils/query';

/**
 * Invalidate comments query - React Query subscribers will auto-refetch.
 */
function invalidateComments(postId: string, order: string) {
    queryClient.invalidateQueries({queryKey: commentKeys.list(postId, order)});
}

async function loadMoreComments({state, api, options, order}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, order?:string}): Promise<Partial<EditableAppContext>> {
    type CommentsQueryData = {comments: Comment[]; pagination: any};
    const effectiveOrder = order || state.order;
    const currentData = queryClient.getQueryData<CommentsQueryData>(commentKeys.list(options.postId, effectiveOrder));

    let page = 1;
    if (currentData?.pagination && currentData.pagination.page) {
        page = currentData.pagination.page + 1;
    }

    let data;
    if (state.admin && state.adminApi) {
        data = await state.adminApi.browse({page, postId: options.postId, order: effectiveOrder, memberUuid: state.member?.uuid});
    } else {
        data = await api.comments.browse({page, postId: options.postId, order: effectiveOrder});
    }

    // Append to cache - for pagination we need to update, not invalidate
    queryClient.setQueryData<CommentsQueryData>(commentKeys.list(options.postId, effectiveOrder), (prev) => {
        const existingComments = prev?.comments ?? [];
        const updatedComments = [...existingComments, ...data.comments];
        const dedupedComments = updatedComments.filter((comment, index, self) =>
            self.findIndex(c => c.id === comment.id) === index
        );

        return {
            comments: dedupedComments,
            pagination: data.meta.pagination
        };
    });

    return {};
}

function setCommentsIsLoading({data: isLoading}: {data: boolean | null}) {
    return {
        commentsIsLoading: isLoading
    };
}

async function setOrder({state, data: {order}, options, api, dispatchAction}: {state: EditableAppContext, data: {order: string}, options: CommentsOptions, api: GhostApi, dispatchAction: DispatchActionType}) {
    dispatchAction('setCommentsIsLoading', true);

    try {
        type CommentsQueryData = {comments: Comment[]; pagination: any};
        let data;
        if (state.admin && state.adminApi) {
            data = await state.adminApi.browse({page: 1, postId: options.postId, order, memberUuid: state.member?.uuid});
        } else {
            data = await api.comments.browse({page: 1, postId: options.postId, order});
        }

        // Populate cache for new order
        queryClient.setQueryData<CommentsQueryData>(commentKeys.list(options.postId, order), {
            comments: [...data.comments],
            pagination: data.meta.pagination
        });

        return {
            order,
            commentsIsLoading: false
        };
    } catch (error) {
        console.error('Failed to set order:', error); // eslint-disable-line no-console
        throw error;
    }
}

async function loadMoreReplies({state, api, options, data: {comment, limit}, isReply}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, data: {comment: Comment, limit?: number | 'all'}, isReply: boolean}): Promise<Partial<EditableAppContext>> {
    type CommentsQueryData = {comments: Comment[]; pagination: any};

    const fetchReplies = async (afterReplyId: string | undefined, requestLimit: number) => {
        if (state.admin && state.adminApi && !isReply) {
            return await state.adminApi.replies({commentId: comment.id, afterReplyId, limit: requestLimit, memberUuid: state.member?.uuid});
        } else {
            return await api.comments.replies({commentId: comment.id, afterReplyId, limit: requestLimit});
        }
    };

    let afterReplyId: string | undefined = comment.replies && comment.replies.length > 0
        ? comment.replies[comment.replies.length - 1]?.id
        : undefined;

    let allComments: Comment[] = [];

    if (limit === 'all') {
        let hasMore = true;
        while (hasMore) {
            const data = await fetchReplies(afterReplyId, 100);
            allComments.push(...data.comments);
            hasMore = !!data.meta.pagination.next;
            if (data.comments && data.comments.length > 0) {
                afterReplyId = data.comments[data.comments.length - 1]?.id;
            } else {
                hasMore = false;
            }
        }
    } else {
        const data = await fetchReplies(afterReplyId, limit as number || 100);
        allComments = data.comments;
    }

    // Update cache with new replies appended
    queryClient.setQueryData<CommentsQueryData>(commentKeys.list(options.postId, state.order), (prev) => {
        if (!prev) {
            return prev;
        }
        return {
            ...prev,
            comments: prev.comments.map((c) => {
                if (c.id === comment.id) {
                    return {
                        ...comment,
                        replies: [...comment.replies, ...allComments]
                    };
                }
                return c;
            })
        };
    });

    return {};
}

async function addComment({state, api, options, data: comment}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, data: AddComment}) {
    const data = await api.comments.add({comment});
    const newComment = data.comments[0];

    // Invalidate - React Query subscribers will refetch
    invalidateComments(options.postId, state.order);

    return {
        commentCount: state.commentCount + 1,
        commentIdToScrollTo: newComment.id
    };
}

async function addReply({state, api, options, data: {reply, parent}}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, data: {reply: any, parent: any}}) {
    const data = await api.comments.add({
        comment: {...reply, parent_id: parent.id}
    });
    const newComment = data.comments[0];

    // Invalidate - React Query subscribers will refetch
    invalidateComments(options.postId, state.order);

    return {
        commentCount: state.commentCount + 1,
        commentIdToScrollTo: newComment.id
    };
}

async function hideComment({state, options, data: comment}: {state: EditableAppContext, options: CommentsOptions, adminApi: any, data: {id: string}}) {
    if (state.adminApi) {
        await state.adminApi.hideComment(comment.id);
    }

    // Update cache directly with hidden status for immediate feedback
    type CommentsQueryData = {comments: Comment[]; pagination: any};
    queryClient.setQueryData<CommentsQueryData>(commentKeys.list(options.postId, state.order), (prev) => {
        if (!prev) {
            return prev;
        }
        return {
            ...prev,
            comments: prev.comments.map((c) => {
                const replies = c.replies.map((r) => {
                    if (r.id === comment.id) {
                        return {...r, status: 'hidden'};
                    }
                    return r;
                });

                if (c.id === comment.id) {
                    return {...c, status: 'hidden', replies};
                }

                return {...c, replies};
            })
        };
    });

    return {
        commentCount: state.commentCount - 1
    };
}

async function showComment({state, api, options, data: comment}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, adminApi: any, data: {id: string}}) {
    if (state.adminApi) {
        await state.adminApi.showComment({id: comment.id});
    }

    // Refetch the comment to get fresh content
    let updatedComment;
    if (state.admin && state.adminApi) {
        const data = await state.adminApi.read({commentId: comment.id, memberUuid: state.member?.uuid});
        updatedComment = data.comments[0];
    } else {
        const data = await api.comments.read(comment.id);
        updatedComment = data.comments[0];
    }

    // Update cache directly with the refreshed comment
    type CommentsQueryData = {comments: Comment[]; pagination: any};
    queryClient.setQueryData<CommentsQueryData>(commentKeys.list(options.postId, state.order), (prev) => {
        if (!prev) {
            return prev;
        }
        return {
            ...prev,
            comments: prev.comments.map((c) => {
                const replies = c.replies.map((r) => {
                    if (r.id === comment.id) {
                        return updatedComment;
                    }
                    return r;
                });

                if (c.id === comment.id) {
                    return updatedComment;
                }

                return {...c, replies};
            })
        };
    });

    return {
        commentCount: state.commentCount + 1
    };
}

async function updateCommentLikeState({state, options, data: comment}: {state: EditableAppContext, options: CommentsOptions, data: {id: string, liked: boolean}}) {
    type CommentsQueryData = {comments: Comment[]; pagination: any};

    // Optimistic update - directly update cache for instant feedback
    queryClient.setQueryData<CommentsQueryData>(commentKeys.list(options.postId, state.order), (prev) => {
        if (!prev) {
            return prev;
        }
        return {
            ...prev,
            comments: prev.comments.map((c) => {
                const replies = c.replies.map((r) => {
                    if (r.id === comment.id) {
                        return {
                            ...r,
                            liked: comment.liked,
                            count: {
                                ...r.count,
                                likes: comment.liked ? r.count.likes + 1 : r.count.likes - 1
                            }
                        };
                    }
                    return r;
                });

                if (c.id === comment.id) {
                    return {
                        ...c,
                        liked: comment.liked,
                        replies,
                        count: {
                            ...c.count,
                            likes: comment.liked ? c.count.likes + 1 : c.count.likes - 1
                        }
                    };
                }

                return {...c, replies};
            })
        };
    });

    return {};
}

async function likeComment({api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    dispatchAction('updateCommentLikeState', {id: comment.id, liked: true});
    try {
        await api.comments.like({comment});
        return {};
    } catch {
        dispatchAction('updateCommentLikeState', {id: comment.id, liked: false});
    }
}

async function unlikeComment({api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    dispatchAction('updateCommentLikeState', {id: comment.id, liked: false});

    try {
        await api.comments.unlike({comment});
        return {};
    } catch {
        dispatchAction('updateCommentLikeState', {id: comment.id, liked: true});
    }
}

async function reportComment({api, data: comment}: {api: GhostApi, data: {id: string}}) {
    await api.comments.report({comment});

    return {};
}

async function deleteComment({state, api, options, data: comment}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, data: {id: string}, dispatchAction: DispatchActionType}) {
    await api.comments.edit({
        comment: {
            id: comment.id,
            status: 'deleted'
        }
    });

    // Invalidate - React Query subscribers will refetch
    invalidateComments(options.postId, state.order);

    return {
        commentCount: state.commentCount - 1
    };
}

async function editComment({state, api, options, data: {comment}}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, data: {comment: Partial<Comment> & {id: string}, parent?: Comment}}) {
    await api.comments.edit({comment});

    // Invalidate - React Query subscribers will refetch
    invalidateComments(options.postId, state.order);

    return {};
}

async function updateMember({data, state, api}: {data: {name: string, expertise: string}, state: EditableAppContext, api: GhostApi}) {
    const {name, expertise} = data;
    const patchData: {name?: string, expertise?: string} = {};

    const originalName = state?.member?.name;

    if (name && originalName !== name) {
        patchData.name = name;
    }

    const originalExpertise = state?.member?.expertise;
    if (expertise !== undefined && originalExpertise !== expertise) {
        // Allow to set it to an empty string or to null
        patchData.expertise = expertise;
    }

    if (Object.keys(patchData).length > 0) {
        try {
            const member = await api.member.update(patchData);
            if (!member) {
                throw new Error('Failed to update member');
            }
            return {
                member,
                success: true
            };
        } catch (err) {
            return {
                success: false,
                error: err
            };
        }
    }
    return null;
}

function openPopup({data}: {data: Page}) {
    return {
        popup: data
    };
}

function closePopup() {
    return {
        popup: null
    };
}

// Sync action: immediately adds a form to openCommentForms state.
// This is separated from the async openCommentForm so the reply form appears
// instantly without waiting for loadMoreReplies to complete.
function addOpenCommentForm({data: newForm, state}: {data: OpenCommentForm, state: EditableAppContext}) {
    // We want to keep the number of displayed forms to a minimum so when opening a
    // new form, we close any existing forms that are empty or have had no changes
    const openFormsAfterAutoclose = state.openCommentForms.filter(form => form.hasUnsavedChanges);

    // avoid multiple forms being open for the same id
    // (e.g. if "Reply" is hit on two different replies, we don't want two forms open at the bottom of that comment thread)
    const openFormIndexForId = openFormsAfterAutoclose.findIndex(form => form.id === newForm.id);
    if (openFormIndexForId > -1) {
        openFormsAfterAutoclose[openFormIndexForId] = newForm;
        return {openCommentForms: openFormsAfterAutoclose};
    } else {
        return {openCommentForms: [...openFormsAfterAutoclose, newForm]};
    }
}

async function openCommentForm({data: newForm, dispatchAction}: {data: OpenCommentForm, api: GhostApi, state: EditableAppContext, dispatchAction: DispatchActionType}) {
    // Pure UI state change — just show the form.
    // We no longer pre-fetch replies here; addReply refetches after submission,
    // which ensures we see all concurrent replies in the correct order.
    dispatchAction('addOpenCommentForm', newForm);
    return {};
}

function setHighlightComment({data: commentId}: {data: string | null}) {
    return {
        commentIdToHighlight: commentId
    };
}

function highlightComment({
    data: {commentId},
    dispatchAction

}: {
    data: { commentId: string | null };
    state: EditableAppContext;
    dispatchAction: DispatchActionType;
}) {
    setTimeout(() => {
        dispatchAction('setHighlightComment', null);
    }, 3000);
    return {
        commentIdToHighlight: commentId
    };
}

function setCommentFormHasUnsavedChanges({data: {id, hasUnsavedChanges}, state}: {data: {id: string, hasUnsavedChanges: boolean}, state: EditableAppContext}) {
    const updatedForms = state.openCommentForms.map((f) => {
        if (f.id === id) {
            return {...f, hasUnsavedChanges};
        } else {
            return {...f};
        };
    });

    return {openCommentForms: updatedForms};
}

function closeCommentForm({data: id, state}: {data: string, state: EditableAppContext}) {
    return {openCommentForms: state.openCommentForms.filter(f => f.id !== id)};
};

function setScrollTarget({data: commentId}: {data: string | null}) {
    return {commentIdToScrollTo: commentId};
}

function incrementCommentCount({state}: {state: EditableAppContext}) {
    return {commentCount: state.commentCount + 1};
}

// Sync actions make use of setState((currentState) => newState), to avoid 'race' conditions
export const SyncActions = {
    openPopup,
    closePopup,
    addOpenCommentForm,
    closeCommentForm,
    setCommentFormHasUnsavedChanges,
    setScrollTarget,
    incrementCommentCount
};

export type SyncActionType = keyof typeof SyncActions;

export const Actions = {
    // Put your actions here
    addComment,
    editComment,
    hideComment,
    deleteComment,
    showComment,
    likeComment,
    unlikeComment,
    reportComment,
    addReply,
    loadMoreComments,
    loadMoreReplies,
    updateMember,
    setOrder,
    openCommentForm,
    highlightComment,
    setHighlightComment,
    setCommentsIsLoading,
    updateCommentLikeState
};

export type ActionType = keyof typeof Actions;

export function isSyncAction(action: string): action is SyncActionType {
    return !!(SyncActions as any)[action];
}

/** Handle actions in the App, returns updated state */
export async function ActionHandler({action, data, state, api, adminApi, options, dispatchAction}: {action: ActionType, data: any, state: EditableAppContext, options: CommentsOptions, api: GhostApi, adminApi: AdminApi, dispatchAction: DispatchActionType}): Promise<Partial<EditableAppContext>> {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, state, api, adminApi, options, dispatchAction} as any) || {};
    }
    return {};
}

/** Handle actions in the App, returns updated state */
export function SyncActionHandler({action, data, state, api, adminApi, options}: {action: SyncActionType, data: any, state: EditableAppContext, options: CommentsOptions, api: GhostApi, adminApi: AdminApi}): Partial<EditableAppContext> {
    const handler = SyncActions[action];
    if (handler) {
        // Do not await here
        return handler({data, state, api, adminApi, options} as any) || {};
    }
    return {};
}
