import {AddComment, Comment, CommentsOptions, EditableAppContext} from './AppContext';
import {AdminApi} from './utils/adminApi';
import {GhostApi} from './utils/api';
import {Page} from './pages';

async function loadMoreComments({state, api, options, order}: {state: EditableAppContext, api: GhostApi, options: CommentsOptions, order?:string}): Promise<Partial<EditableAppContext>> {
    let page = 1;
    if (state.pagination && state.pagination.page) {
        page = state.pagination.page + 1;
    }
    const data = await api.comments.browse({page, postId: options.postId, order: order || state.order});

    // Note: we store the comments from new to old, and show them in reverse order
    return {
        comments: [...state.comments, ...data.comments],
        pagination: data.meta.pagination
    };
}

async function setOrder({data: {order}, options, api}: {state: EditableAppContext, data: {order: string}, options: CommentsOptions, api: GhostApi}) {
    const data = await api.comments.browse({page: 1, postId: options.postId, order: order});
    
    return {
        comments: [...data.comments],
        pagination: data.meta.pagination,
        order
    };
}

async function loadMoreReplies({state, api, data: {comment, limit}}: {state: EditableAppContext, api: GhostApi, data: {comment: any, limit?: number | 'all'}}): Promise<Partial<EditableAppContext>> {
    const data = await api.comments.replies({commentId: comment.id, afterReplyId: comment.replies[comment.replies.length - 1]?.id, limit});

    // Note: we store the comments from new to old, and show them in reverse order
    return {
        comments: state.comments.map((c) => {
            if (c.id === comment.id) {
                return {
                    ...comment,
                    replies: [...comment.replies, ...data.comments]
                };
            }
            return c;
        })
    };
}

async function addComment({state, api, data: comment}: {state: EditableAppContext, api: GhostApi, data: AddComment}) {
    const data = await api.comments.add({comment});
    comment = data.comments[0];

    return {
        comments: [comment, ...state.comments],
        commentCount: state.commentCount + 1
    };
}

async function addReply({state, api, data: {reply, parent}}: {state: EditableAppContext, api: GhostApi, data: {reply: any, parent: any}}) {
    let comment = reply;
    comment.parent_id = parent.id;

    const data = await api.comments.add({comment});
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

async function hideComment({state, adminApi, data: comment}: {state: EditableAppContext, adminApi: any, data: {id: string}}) {
    await adminApi.hideComment(comment.id);

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

async function showComment({state, api, adminApi, data: comment}: {state: EditableAppContext, api: GhostApi, adminApi: any, data: {id: string}}) {
    await adminApi.showComment(comment.id);

    // We need to refetch the comment, to make sure we have an up to date HTML content
    // + all relations are loaded as the current member (not the admin)
    const data = await api.comments.read(comment.id);
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

async function likeComment({state, api, data: comment}: {state: EditableAppContext, api: GhostApi, data: {id: string}}) {
    await api.comments.like({comment});

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        liked: true,
                        count: {
                            ...r.count,
                            likes: r.count.likes + 1
                        }
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    liked: true,
                    replies,
                    count: {
                        ...c.count,
                        likes: c.count.likes + 1
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

async function reportComment({api, data: comment}: {api: GhostApi, data: {id: string}}) {
    await api.comments.report({comment});

    return {};
}

async function unlikeComment({state, api, data: comment}: {state: EditableAppContext, api: GhostApi, data: {id: string}}) {
    await api.comments.unlike({comment});

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        liked: false,
                        count: {
                            ...r.count,
                            likes: r.count.likes - 1
                        }
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    liked: false,
                    replies,
                    count: {
                        ...c.count,
                        likes: c.count.likes - 1
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

async function deleteComment({state, api, data: comment}: {state: EditableAppContext, api: GhostApi, data: {id: string}}) {
    await api.comments.edit({
        comment: {
            id: comment.id,
            status: 'deleted'
        }
    });

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        status: 'deleted'
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    status: 'deleted',
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

function increaseSecundaryFormCount({state}: {state: EditableAppContext}) {
    return {
        secundaryFormCount: state.secundaryFormCount + 1
    };
}

function decreaseSecundaryFormCount({state}: {state: EditableAppContext}) {
    return {
        secundaryFormCount: state.secundaryFormCount - 1
    };
}

// Sync actions make use of setState((currentState) => newState), to avoid 'race' conditions
export const SyncActions = {
    openPopup,
    closePopup,
    increaseSecundaryFormCount,
    decreaseSecundaryFormCount
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
    setOrder
};

export type ActionType = keyof typeof Actions;

export function isSyncAction(action: string): action is SyncActionType {
    return !!(SyncActions as any)[action];
}

/** Handle actions in the App, returns updated state */
export async function ActionHandler({action, data, state, api, adminApi, options}: {action: ActionType, data: any, state: EditableAppContext, options: CommentsOptions, api: GhostApi, adminApi: AdminApi}): Promise<Partial<EditableAppContext>> {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, state, api, adminApi, options} as any) || {};
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
