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
    await api.comments.add({comment});

    const commentStructured = {
        ...comment,
        member: state.member,
        created_at: new Date().toISOString()
    };
    
    return {
        comments: [...state.comments, commentStructured]
        // todo: fix pagination now?
    };
}

const Actions = {
    // Put your actions here
    addComment,
    loadMoreComments
};

/** Handle actions in the App, returns updated state */
export default async function ActionHandler({action, data, state, api}) {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, state, api}) || {};
    }
    return {};
}
