function loadMoreComments({state, api}) {
    let page = 1;
    if (state.pagination && state.pagination.page) {
        page = state.pagination.page + 1;
    }
    const data = api.comments.browse({page, postId: state.postId});
    
    return {
        comments: [...data.comments, ...state.comments],
        pagination: data.meta.pagination
    };
}

function addComment({state, api, data: comment}) {
    const data = api.comments.add({comment});
    
    return {
        comments: [...data.comments, ...state.comments]
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
