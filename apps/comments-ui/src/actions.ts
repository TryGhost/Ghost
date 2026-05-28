import {AddComment, Comment, CommentsOptions, DispatchActionType, EditableAppContext, OpenCommentForm} from './app-context';
import {AdminApi} from './utils/admin-api';
import {GhostApi} from './utils/api';
import {Page} from './pages';

function findCommentById(comments: Comment[], id: string): Comment | undefined {
    for (const c of comments) {
        if (c.id === id) {
            return c;
        }
        for (const r of c.replies || []) {
            if (r.id === id) {
                return r;
            }
        }
    }
    return undefined;
}

async function loadMoreComments({state, api, options, order}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, order?:string}): Promise<Partial<EditableAppContext>> {
    let page = 1;
    if (state.pagination && state.pagination.page) {
        page = state.pagination.page + 1;
    }
    let data;
    if (state.admin && state.adminApi) {
        data = await state.adminApi.browse({page, postId: options.postId, order: order || state.order, memberUuid: state.member?.uuid});
    } else {
        data = await api.comments.browse({page, postId: options.postId, order: order || state.order});
    }

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

async function setOrder({state, data: {order}, options, api, dispatchAction}: {state: EditableAppContext, data: {order: string}, options: CommentsOptions, api: GhostApi, dispatchAction: DispatchActionType}) {
    dispatchAction('setCommentsIsLoading', true);

    try {
        let data;
        if (state.admin && state.adminApi) {
            data = await state.adminApi.browse({page: 1, postId: options.postId, order, memberUuid: state.member?.uuid});
        } else {
            data = await api.comments.browse({page: 1, postId: options.postId, order});
        }

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

async function loadMoreReplies({state, api, data: {comment, limit}, isReply}: {state: EditableAppContext, api: GhostApi, data: {comment: Comment, limit?: number | 'all'}, isReply: boolean}): Promise<Partial<EditableAppContext>> {
    const fetchReplies = async (afterReplyId: string | undefined, requestLimit: number) => {
        if (state.admin && state.adminApi && !isReply) { // we don't want the admin api to load reply data for replying to a reply, so we pass isReply: true
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
            hasMore = !!data.meta?.pagination?.next;

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

async function addComment({state, api, data: comment}: {state: EditableAppContext, api: GhostApi, data: AddComment}) {
    const data = await api.comments.add({comment});
    const newComment = data.comments[0];

    return {
        comments: [newComment, ...state.comments],
        commentCount: state.commentCount + 1,
        commentIdToScrollTo: newComment.id
    };
}

async function addReply({state, api, data: {reply, parent}}: {state: EditableAppContext, api: GhostApi, data: {reply: any, parent: any}}) {
    const data = await api.comments.add({
        comment: {...reply, parent_id: parent.id}
    });
    const newComment = data.comments[0];

    const allReplies = await api.comments.replies({commentId: parent.id, limit: 'all'});
    // Caching can serve a stale replies response immediately after creation, so
    // keep the refetch for concurrent replies but preserve the POSTed reply.
    const replies = allReplies.comments.some(replyComment => replyComment.id === newComment.id)
        ? allReplies.comments
        : [...allReplies.comments, newComment];

    return {
        comments: state.comments.map((c) => {
            if (c.id === parent.id) {
                return {
                    ...c,
                    replies,
                    count: {
                        ...c.count,
                        replies: replies.length
                    }
                };
            }
            return c;
        }),
        commentCount: state.commentCount + 1,
        commentIdToScrollTo: newComment.id
    };
}

async function hideComment({state, data: comment}: {state: EditableAppContext, adminApi: any, data: {id: string}}) {
    if (state.adminApi) {
        await state.adminApi.hideComment(comment.id);
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

async function showComment({state, api, data: comment}: {state: EditableAppContext, api: GhostApi, adminApi: any, data: {id: string}}) {
    if (state.adminApi) {
        await state.adminApi.showComment({id: comment.id});
    }
    // We need to refetch the comment, to make sure we have an up to date HTML content
    // + all relations are loaded as the current member (not the admin)
    let data;
    if (state.admin && state.adminApi) {
        data = await state.adminApi.read({commentId: comment.id, memberUuid: state.member?.uuid});
    } else {
        data = await api.comments.read(comment.id);
    }

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

async function pinComment({state, data: comment, dispatchAction}: {state: EditableAppContext, data: {id: string}, dispatchAction: DispatchActionType}) {
    if (state.adminApi) {
        await state.adminApi.pinComment({id: comment.id});
        dispatchAction('setOrder', {order: state.order});
    }

    return null;
}

async function unpinComment({state, data: comment, dispatchAction}: {state: EditableAppContext, data: {id: string}, dispatchAction: DispatchActionType}) {
    if (state.adminApi) {
        await state.adminApi.unpinComment({id: comment.id});
        dispatchAction('setOrder', {order: state.order});
    }

    return null;
}

async function updateCommentLikeState({state, data: comment}: {state: EditableAppContext, data: {id: string, liked: boolean, wasDisliked?: boolean, restoreDisliked?: boolean, expectedLiked?: boolean, expectedDisliked?: boolean, expectedVotePending?: boolean, votePending?: boolean}}) {
    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    if (comment.expectedLiked !== undefined && r.liked !== comment.expectedLiked) {
                        return r;
                    }
                    if (comment.expectedDisliked !== undefined && Boolean(r.disliked) !== comment.expectedDisliked) {
                        return r;
                    }
                    if (comment.expectedVotePending !== undefined && Boolean(r.votePending) !== comment.expectedVotePending) {
                        return r;
                    }

                    return {
                        ...r,
                        liked: comment.liked,
                        disliked: comment.restoreDisliked ?? (comment.liked ? false : r.disliked),
                        votePending: comment.votePending ?? r.votePending,
                        count: {
                            ...r.count,
                            likes: comment.liked ? r.count.likes + 1 : r.count.likes - 1
                        }
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                if (comment.expectedLiked !== undefined && c.liked !== comment.expectedLiked) {
                    return {
                        ...c,
                        replies
                    };
                }
                if (comment.expectedDisliked !== undefined && Boolean(c.disliked) !== comment.expectedDisliked) {
                    return {
                        ...c,
                        replies
                    };
                }
                if (comment.expectedVotePending !== undefined && Boolean(c.votePending) !== comment.expectedVotePending) {
                    return {
                        ...c,
                        replies
                    };
                }

                return {
                    ...c,
                    liked: comment.liked,
                    disliked: comment.restoreDisliked ?? (comment.liked ? false : c.disliked),
                    votePending: comment.votePending ?? c.votePending,
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

async function updateCommentDislikeState({state, data: comment}: {state: EditableAppContext, data: {id: string, disliked: boolean, wasLiked?: boolean, restoreLiked?: boolean, expectedDisliked?: boolean, expectedLiked?: boolean, expectedVotePending?: boolean, votePending?: boolean}}) {
    const updateLikeCount = (count: number) => {
        if (comment.disliked && comment.wasLiked) {
            return count - 1;
        }
        if (comment.restoreLiked) {
            return count + 1;
        }
        return count;
    };

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    if (comment.expectedDisliked !== undefined && r.disliked !== comment.expectedDisliked) {
                        return r;
                    }
                    if (comment.expectedLiked !== undefined && r.liked !== comment.expectedLiked) {
                        return r;
                    }
                    if (comment.expectedVotePending !== undefined && Boolean(r.votePending) !== comment.expectedVotePending) {
                        return r;
                    }

                    return {
                        ...r,
                        disliked: comment.disliked,
                        liked: comment.restoreLiked ?? (comment.disliked ? false : r.liked),
                        votePending: comment.votePending ?? r.votePending,
                        count: {
                            ...r.count,
                            likes: updateLikeCount(r.count.likes)
                        }
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                if (comment.expectedDisliked !== undefined && c.disliked !== comment.expectedDisliked) {
                    return {
                        ...c,
                        replies
                    };
                }
                if (comment.expectedLiked !== undefined && c.liked !== comment.expectedLiked) {
                    return {
                        ...c,
                        replies
                    };
                }
                if (comment.expectedVotePending !== undefined && Boolean(c.votePending) !== comment.expectedVotePending) {
                    return {
                        ...c,
                        replies
                    };
                }

                return {
                    ...c,
                    disliked: comment.disliked,
                    liked: comment.restoreLiked ?? (comment.disliked ? false : c.liked),
                    votePending: comment.votePending ?? c.votePending,
                    replies,
                    count: {
                        ...c.count,
                        likes: updateLikeCount(c.count.likes)
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

async function updateCommentVotePendingState({state, data: comment}: {state: EditableAppContext, data: {id: string, votePending: boolean, expectedVotePending?: boolean}}) {
    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    if (comment.expectedVotePending !== undefined && Boolean(r.votePending) !== comment.expectedVotePending) {
                        return r;
                    }

                    return {
                        ...r,
                        votePending: comment.votePending
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                if (comment.expectedVotePending !== undefined && Boolean(c.votePending) !== comment.expectedVotePending) {
                    return {
                        ...c,
                        replies
                    };
                }

                return {
                    ...c,
                    votePending: comment.votePending,
                    replies
                };
            }

            return {
                ...c,
                replies
            };
        })
    };
}

async function likeComment({state, api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    const currentComment = findCommentById(state.comments, comment.id);
    if (currentComment?.votePending) {
        return {};
    }

    const wasDisliked = currentComment?.disliked ?? false;
    dispatchAction('updateCommentLikeState', {id: comment.id, liked: true, wasDisliked, votePending: true});
    try {
        await api.comments.like({comment});
        dispatchAction('updateCommentVotePendingState', {id: comment.id, votePending: false, expectedVotePending: true});
        return {};
    } catch {
        dispatchAction('updateCommentLikeState', {id: comment.id, liked: false, restoreDisliked: wasDisliked, expectedLiked: true, expectedVotePending: true, votePending: false});
    }
}

async function unlikeComment({state, api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    const currentComment = findCommentById(state.comments, comment.id);
    if (currentComment?.votePending) {
        return {};
    }

    dispatchAction('updateCommentLikeState', {id: comment.id, liked: false, votePending: true});

    try {
        await api.comments.unlike({comment});
        dispatchAction('updateCommentVotePendingState', {id: comment.id, votePending: false, expectedVotePending: true});
        return {};
    } catch {
        dispatchAction('updateCommentLikeState', {id: comment.id, liked: true, expectedLiked: false, expectedDisliked: false, expectedVotePending: true, votePending: false});
    }
}

async function dislikeComment({state, api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    const currentComment = findCommentById(state.comments, comment.id);
    if (currentComment?.votePending) {
        return {};
    }

    const wasLiked = currentComment?.liked ?? false;
    dispatchAction('updateCommentDislikeState', {id: comment.id, disliked: true, wasLiked, votePending: true});
    try {
        await api.comments.dislike({comment});
        dispatchAction('updateCommentVotePendingState', {id: comment.id, votePending: false, expectedVotePending: true});
        return {};
    } catch {
        dispatchAction('updateCommentDislikeState', {id: comment.id, disliked: false, restoreLiked: wasLiked, expectedDisliked: true, expectedVotePending: true, votePending: false});
    }
}

async function undislikeComment({state, api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    const currentComment = findCommentById(state.comments, comment.id);
    if (currentComment?.votePending) {
        return {};
    }

    dispatchAction('updateCommentDislikeState', {id: comment.id, disliked: false, votePending: true});

    try {
        await api.comments.undislike({comment});
        dispatchAction('updateCommentVotePendingState', {id: comment.id, votePending: false, expectedVotePending: true});
        return {};
    } catch {
        dispatchAction('updateCommentDislikeState', {id: comment.id, disliked: true, expectedDisliked: false, expectedLiked: false, expectedVotePending: true, votePending: false});
    }
}

async function reportComment({api, data: comment}: {api: GhostApi, data: {id: string}}) {
    await api.comments.report({comment});

    return {};
}

function hasDescendantReply(replies: Comment[], commentId: string) {
    return replies.some(reply => reply.in_reply_to_id === commentId);
}

function isTombstoneReply(reply: Comment, isAdmin: boolean) {
    return reply.status === 'deleted' || (!isAdmin && reply.status === 'hidden');
}

function pruneOrphanTombstoneReplies(replies: Comment[], isAdmin: boolean) {
    let prunedReplies = replies;
    let removedReply = false;

    do {
        removedReply = false;
        prunedReplies = prunedReplies.filter((reply) => {
            if (!isTombstoneReply(reply, isAdmin) || hasDescendantReply(prunedReplies, reply.id)) {
                return true;
            }

            removedReply = true;
            return false;
        });
    } while (removedReply);

    return prunedReplies;
}

function decrementCount(count: number | undefined) {
    return Math.max((count || 0) - 1, 0);
}

async function deleteComment({state, api, data: comment, dispatchAction}: {state: EditableAppContext, api: GhostApi, data: {id: string}, dispatchAction: DispatchActionType}) {
    await api.comments.edit({
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
            const replyToDelete = topLevelComment.replies.find(reply => reply.id === comment.id);
            const keepTombstone = replyToDelete ? hasDescendantReply(topLevelComment.replies, replyToDelete.id) : false;
            const repliesAfterDelete = topLevelComment.replies.reduce<Comment[]>((replies, reply) => {
                if (reply.id !== comment.id) {
                    replies.push(reply);
                    return replies;
                }

                if (keepTombstone) {
                    replies.push({
                        ...reply,
                        status: 'deleted',
                        html: null
                    });
                }

                return replies;
            }, []);
            const updatedReplies = pruneOrphanTombstoneReplies(repliesAfterDelete, state.isAdmin);
            const hasDeletedReply = originalLength !== updatedReplies.length || keepTombstone;

            const updatedTopLevelComment = {
                ...topLevelComment,
                replies: updatedReplies
            };

            if (hasDeletedReply && replyToDelete && !['hidden', 'deleted'].includes(replyToDelete.status)) {
                const wasDirectReply = !replyToDelete.in_reply_to_id || replyToDelete.in_reply_to_id === topLevelComment.id;

                updatedTopLevelComment.count = {
                    ...updatedTopLevelComment.count,
                    replies: decrementCount(updatedTopLevelComment.count?.replies),
                    direct_replies: wasDirectReply ? decrementCount(updatedTopLevelComment.count?.direct_replies) : updatedTopLevelComment.count?.direct_replies
                };
            }

            return updatedTopLevelComment;
        }).filter(Boolean),
        commentCount: state.commentCount - 1
    };
}

async function editComment({state, api, data: {comment, parent}}: {state: EditableAppContext, api: GhostApi, data: {comment: Partial<Comment> & {id: string}, parent?: Comment}}) {
    const data = await api.comments.edit({
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

async function openCommentForm({data: newForm, api, state}: {data: OpenCommentForm, api: GhostApi, state: EditableAppContext}) {
    let otherStateChanges = {};

    // When opening a reply form, load all replies for the parent comment so the
    // reply appears in the correct position after posting
    const topLevelCommentId = newForm.parent_id || newForm.id;
    if (newForm.type === 'reply' && !state.openCommentForms.some(f => f.id === topLevelCommentId || f.parent_id === topLevelCommentId)) {
        const comment = state.comments.find(c => c.id === topLevelCommentId);

        if (comment) {
            try {
                const newCommentsState = await loadMoreReplies({state, api, data: {comment, limit: 'all'}, isReply: true});
                otherStateChanges = {...otherStateChanges, ...newCommentsState};
            } catch (e) {
                // If loading replies fails, continue anyway - the form should still open
                // and replies will be loaded when the user submits
                console.error('[Comments] Failed to load replies before opening form:', e); // eslint-disable-line no-console
            }
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
    }
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

function setHashCommentId({data: commentId}: {data: string | null}) {
    return {commentIdFromHash: commentId};
}

// Sync actions make use of setState((currentState) => newState), to avoid 'race' conditions
export const SyncActions = {
    openPopup,
    closePopup,
    closeCommentForm,
    setCommentFormHasUnsavedChanges,
    setScrollTarget,
    setHashCommentId
};

export type SyncActionType = keyof typeof SyncActions;

export const Actions = {
    addComment,
    editComment,
    hideComment,
    pinComment,
    unpinComment,
    deleteComment,
    showComment,
    likeComment,
    unlikeComment,
    dislikeComment,
    undislikeComment,
    reportComment,
    addReply,
    loadMoreComments,
    loadMoreReplies,
    openCommentForm,
    updateMember,
    setOrder,
    highlightComment,
    setHighlightComment,
    setCommentsIsLoading,
    updateCommentLikeState,
    updateCommentDislikeState,
    updateCommentVotePendingState
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
