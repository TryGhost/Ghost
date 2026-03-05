import {AddComment, Comment, CommentsOptions, DispatchActionType, EditableAppContext, OpenCommentForm} from './app-context';
import {CommentApi} from './components/comment-api-provider';
import {Page} from './pages';

async function loadMoreComments({state, commentApi, options, order}: {state: EditableAppContext, commentApi: CommentApi, options: CommentsOptions, order?: string}): Promise<Partial<EditableAppContext>> {
    let page = 1;
    if (state.pagination && state.pagination.page) {
        page = state.pagination.page + 1;
    }
    const data = await commentApi.browse({page, postId: options.postId, order: order || state.order});

    const updatedComments = [...state.comments, ...data.comments];
    const dedupedComments = updatedComments.filter((comment, index, self) => self.findIndex(c => c.id === comment.id) === index);

    // Note: we store the comments from new to old, and show them in reverse order
    return {
        comments: dedupedComments,
        pagination: data.meta.pagination
    };
}

function setCommentsIsLoading({data: isLoading}: {data: boolean | null}) {
    return {
        commentsIsLoading: isLoading
    };
}

async function setOrder({state, data: {order}, options, commentApi, dispatchAction}: {state: EditableAppContext, data: {order: string}, options: CommentsOptions, commentApi: CommentApi, dispatchAction: DispatchActionType}) {
    dispatchAction('setCommentsIsLoading', true);

    try {
        const data = await commentApi.browse({page: 1, postId: options.postId, order});

        return {
            comments: [...data.comments],
            pagination: data.meta.pagination,
            order,
            commentsIsLoading: false
        };
    } catch (error) {
        console.error('Failed to set order:', error); // eslint-disable-line no-console
        state.commentsIsLoading = false;
        throw error; // Rethrow the error to allow upstream handling
    }
}

async function loadMoreReplies({state, commentApi, data: {comment, limit}}: {state: EditableAppContext, commentApi: CommentApi, data: {comment: Comment, limit?: number | 'all'}}): Promise<Partial<EditableAppContext>> {
    const fetchReplies = async (afterReplyId: string | undefined, requestLimit: number) => {
        return await commentApi.replies({commentId: comment.id, afterReplyId, limit: requestLimit});
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
                // If no comments returned, stop pagination to prevent infinite loop
                hasMore = false;
            }
        }
    } else {
        const data = await fetchReplies(afterReplyId, limit as number || 100);
        allComments = data.comments;
    }

    // Note: we store the comments from new to old, and show them in reverse order
    return {
        comments: state.comments.map((c) => {
            if (c.id === comment.id) {
                return {
                    ...comment,
                    replies: [...comment.replies, ...allComments]
                };
            }
            return c;
        })
    };
}

async function addComment({state, commentApi, data: comment}: {state: EditableAppContext, commentApi: CommentApi, data: AddComment}) {
    const data = await commentApi.add({comment});
    comment = data.comments[0];

    return {
        comments: [comment, ...state.comments],
        commentCount: state.commentCount + 1
    };
}

async function addReply({state, commentApi, data: {reply, parent}}: {state: EditableAppContext, commentApi: CommentApi, data: {reply: any, parent: any}}) {
    let comment = reply;
    comment.parent_id = parent.id;

    const data = await commentApi.add({comment});
    comment = data.comments[0];

    // When we add a reply,
    // it is possible that we didn't load all the replies for the given comment yet.
    // To fix that, we'll save the reply to a different field that is created locally to differentiate between replies before and after pagination 😅

    // Replace the comment in the state with the new one
    return {
        comments: state.comments.map((c) => {
            if (c.id === parent.id) {
                return {
                    ...parent,
                    replies: [...parent.replies, comment],
                    count: {
                        ...parent.count,
                        replies: parent.count.replies + 1
                    }
                };
            }
            return c;
        }),
        commentCount: state.commentCount + 1
    };
}

async function hideComment({state, commentApi, data: comment}: {state: EditableAppContext, commentApi: CommentApi, data: {id: string}}) {
    if (commentApi.isAdmin) {
        await commentApi.hideComment(comment.id);
    }
    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        status: 'hidden'
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    status: 'hidden',
                    replies
                };
            }

            return {
                ...c,
                replies
            };
        }),
        commentCount: state.commentCount - 1
    };
}

async function showComment({state, commentApi, data: comment}: {state: EditableAppContext, commentApi: CommentApi, data: {id: string}}) {
    if (commentApi.isAdmin) {
        await commentApi.showComment({id: comment.id});
    }
    // We need to refetch the comment, to make sure we have an up to date HTML content
    // + all relations are loaded as the current member (not the admin)
    const data = await commentApi.read(comment.id);

    const updatedComment = data.comments[0];

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return updatedComment;
                }

                return r;
            });

            if (c.id === comment.id) {
                return updatedComment;
            }

            return {
                ...c,
                replies
            };
        }),
        commentCount: state.commentCount + 1
    };
}

async function updateCommentLikeState({state, data: comment}: {state: EditableAppContext, data: {id: string, liked: boolean}}) {
    return {
        comments: state.comments.map((c) => {
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

            return {
                ...c,
                replies
            };
        })
    };
}

async function likeComment({commentApi, data: comment, dispatchAction}: {state: EditableAppContext, commentApi: CommentApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    dispatchAction('updateCommentLikeState', {id: comment.id, liked: true});
    try {
        await commentApi.like({comment});
        return {};
    } catch {
        dispatchAction('updateCommentLikeState', {id: comment.id, liked: false});
    }
}

async function unlikeComment({commentApi, data: comment, dispatchAction}: {state: EditableAppContext, commentApi: CommentApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    dispatchAction('updateCommentLikeState', {id: comment.id, liked: false});

    try {
        await commentApi.unlike({comment});
        return {};
    } catch {
        dispatchAction('updateCommentLikeState', {id: comment.id, liked: true});
    }
}

async function reportComment({commentApi, data: comment}: {commentApi: CommentApi, data: {id: string}}) {
    await commentApi.report({comment});

    return {};
}

async function deleteComment({state, commentApi, data: comment, dispatchAction}: {state: EditableAppContext, commentApi: CommentApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    await commentApi.edit({
        comment: {
            id: comment.id,
            status: 'deleted'
        }
    });

    // If we're deleting a top-level comment with no replies we refresh the
    // whole comments section to maintain correct pagination
    const commentToDelete = state.comments.find(c => c.id === comment.id);
    if (commentToDelete && (!commentToDelete.replies || commentToDelete.replies.length === 0)) {
        dispatchAction('setOrder', {order: state.order});
        return null;
    }

    return {
        comments: state.comments.map((topLevelComment) => {
            // If the comment has replies we want to keep it so the replies are
            // still visible, but mark the comment as deleted. Otherwise remove it.
            if (topLevelComment.id === comment.id) {
                if (topLevelComment.replies.length > 0) {
                    return {
                        ...topLevelComment,
                        status: 'deleted'
                    };
                } else {
                    return null; // Will be filtered out later
                }
            }

            const originalLength = topLevelComment.replies.length;
            const updatedReplies = topLevelComment.replies.filter(reply => reply.id !== comment.id);
            const hasDeletedReply = originalLength !== updatedReplies.length;

            const updatedTopLevelComment = {
                ...topLevelComment,
                replies: updatedReplies
            };

            // When a reply is deleted we need to update the parent's count so
            // pagination displays the correct number of replies still to load
            if (hasDeletedReply && topLevelComment.count?.replies) {
                topLevelComment.count.replies = topLevelComment.count.replies - 1;
            }

            return updatedTopLevelComment;
        }).filter(Boolean),
        commentCount: state.commentCount - 1
    };
}

async function editComment({state, commentApi, data: {comment, parent}}: {state: EditableAppContext, commentApi: CommentApi, data: {comment: Partial<Comment> & {id: string}, parent?: Comment}}) {
    const data = await commentApi.edit({
        comment
    });
    comment = data.comments[0];

    // Replace the comment in the state with the new one
    return {
        comments: state.comments.map((c) => {
            if (parent && parent.id === c.id) {
                return {
                    ...c,
                    replies: c.replies.map((r) => {
                        if (r.id === comment.id) {
                            return comment;
                        }
                        return r;
                    })
                };
            } else if (c.id === comment.id) {
                return comment;
            }

            return c;
        })
    };
}

async function updateMember({data, state, commentApi}: {data: {name: string, expertise: string}, state: EditableAppContext, commentApi: CommentApi}) {
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
            const member = await commentApi.updateMember(patchData);
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

async function openCommentForm({data: newForm, commentApi, state}: {data: OpenCommentForm, commentApi: CommentApi, state: EditableAppContext}) {
    let otherStateChanges = {};

    // When opening a reply form, we load in all of the replies for the parent comment so that
    // the reply shown after posting appears in the correct place based on ordering
    const topLevelCommentId = newForm.parent_id || newForm.id;
    if (newForm.type === 'reply' && !state.openCommentForms.some(f => f.id === topLevelCommentId || f.parent_id === topLevelCommentId)) {
        const comment = state.comments.find(c => c.id === topLevelCommentId);

        if (comment) {
            const newCommentsState = await loadMoreReplies({state, commentApi, data: {comment, limit: 'all'}});
            otherStateChanges = {...otherStateChanges, ...newCommentsState};
        }
    }

    // We want to keep the number of displayed forms to a minimum so when opening a
    // new form, we close any existing forms that are empty or have had no changes
    const openFormsAfterAutoclose = state.openCommentForms.filter(form => form.hasUnsavedChanges);

    // avoid multiple forms being open for the same id
    // (e.g. if "Reply" is hit on two different replies, we don't want two forms open at the bottom of that comment thread)
    const openFormIndexForId = openFormsAfterAutoclose.findIndex(form => form.id === newForm.id);
    if (openFormIndexForId > -1) {
        openFormsAfterAutoclose[openFormIndexForId] = newForm;

        return {openCommentForms: openFormsAfterAutoclose, ...otherStateChanges};
    } else {
        return {openCommentForms: [...openFormsAfterAutoclose, newForm], ...otherStateChanges};
    };
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

// Sync actions make use of setState((currentState) => newState), to avoid 'race' conditions
export const SyncActions = {
    openPopup,
    closePopup,
    closeCommentForm,
    setCommentFormHasUnsavedChanges,
    setScrollTarget
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
export async function ActionHandler({action, data, state, commentApi, options, dispatchAction}: {action: ActionType, data: any, state: EditableAppContext, options: CommentsOptions, commentApi: CommentApi, dispatchAction: DispatchActionType}): Promise<Partial<EditableAppContext>> {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, state, commentApi, options, dispatchAction} as any) || {};
    }
    return {};
}

/** Handle actions in the App, returns updated state */
export function SyncActionHandler({action, data, state, options}: {action: SyncActionType, data: any, state: EditableAppContext, options: CommentsOptions}): Partial<EditableAppContext> {
    const handler = SyncActions[action];
    if (handler) {
        // Do not await here
        return handler({data, state, options} as any) || {};
    }
    return {};
}
