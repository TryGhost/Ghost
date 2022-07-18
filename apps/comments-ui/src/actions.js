async function loadMoreComments({state, api}) {
    let page = 1;
    if (state.pagination && state.pagination.page) {
        page = state.pagination.page + 1;
    }
    const data = await api.comments.browse({page, postId: state.postId});

    // Note: we store the comments from new to old, and show them in reverse order
    return {
        comments: [...state.comments, ...data.comments],
        pagination: data.meta.pagination
    };
}

async function addComment({state, api, data: comment}) {
    const data = await api.comments.add({comment});
    comment = data.comments[0];

    // Temporary workaround for missing member relation (bug in API)
    const commentStructured = {
        ...comment,
        member: state.member,
        replies: []
    };

    return {
        comments: [commentStructured, ...state.comments]
        // todo: fix pagination now?
    };
}

async function addReply({state, api, data: {reply, parent}}) {
    let comment = reply;
    comment.parent_id = parent.id;

    const data = await api.comments.add({comment});
    comment = data.comments[0];

    // Temporary workaround for missing member relation (bug in API)
    comment = {
        ...comment,
        member: state.member
    };

    // Replace the comment in the state with the new one
    return {
        comments: state.comments.map((c) => {
            if (c.id === parent.id) {
                return {
                    ...parent,
                    replies: [...parent.replies, comment]
                };
            }
            return c;
        })
    };
}

async function hideComment({state, adminApi, data: comment}) {
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
        })
    };
}

async function showComment({state, adminApi, data: comment}) {
    await adminApi.showComment(comment.id);

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        status: 'published'
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    status: 'published',
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

async function likeComment({state, api, data: comment}) {
    await api.comments.like({comment});

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        liked: true,
                        likes_count: r.likes_count + 1
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    liked: true,
                    likes_count: c.likes_count + 1,
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

async function reportComment({state, api, data: comment}) {
    await api.comments.report({comment});

    return {};
}

async function unlikeComment({state, api, data: comment}) {
    await api.comments.unlike({comment});

    return {
        comments: state.comments.map((c) => {
            const replies = c.replies.map((r) => {
                if (r.id === comment.id) {
                    return {
                        ...r,
                        liked: false,
                        likes_count: r.likes_count - 1
                    };
                }

                return r;
            });

            if (c.id === comment.id) {
                return {
                    ...c,
                    liked: false,
                    likes_count: c.likes_count - 1,
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

async function deleteComment({state, api, data: comment}) {
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
        })
    };
}

async function editComment({state, api, data: {comment, parent}}) {
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

const Actions = {
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
    loadMoreComments
};

/** Handle actions in the App, returns updated state */
export default async function ActionHandler({action, data, state, api, adminApi}) {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, state, api, adminApi}) || {};
    }
    return {};
}
