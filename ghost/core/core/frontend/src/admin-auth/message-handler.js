const adminUrl = window.location.href.replace('auth-frame/', '') + 'api/admin';

// At compile time, we'll replace the value with the actual origin.
const siteOrigin = '{{SITE_ORIGIN}}';

function id(value) {
    if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) {
        throw new Error('Invalid identifier');
    }
    return value;
}

function qs(params) {
    const s = new URLSearchParams(params).toString();
    return s ? '?' + s : '';
}

function setCommentStatus(commentId, status) {
    const safeId = id(commentId);
    return fetch(`${adminUrl}/comments/${safeId}/`, {
        method: 'PUT',
        body: JSON.stringify({
            comments: [{id: safeId, status}]
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

const actions = {
    browseComments: d => fetch(`${adminUrl}/comments/post/${id(d.postId)}/${qs(d.params)}`),
    getReplies: d => fetch(`${adminUrl}/comments/${id(d.commentId)}/replies/${qs(d.params)}`),
    readComment: d => fetch(`${adminUrl}/comments/${id(d.commentId)}/${qs(d.params)}`),
    getUser: () => fetch(`${adminUrl}/users/me/?include=roles`),
    hideComment: d => setCommentStatus(d.id, 'hidden'),
    showComment: d => setCommentStatus(d.id, 'published')
};

window.addEventListener('message', async function (event) {
    if (event.origin !== siteOrigin) {
        console.warn('Ignored message to admin auth iframe because of mismatch in origin', 'expected', siteOrigin, 'got', event.origin, 'with data', event.data);
        return;
    }

    let data;
    try {
        data = JSON.parse(event.data);
    } catch (err) {
        console.error('Admin auth iframe failed to parse message from site origin:', event.data, err);
        return;
    }

    function respond(error, result) {
        event.source.postMessage(JSON.stringify({
            uid: data.uid,
            error: error ? error.message : null,
            result
        }), siteOrigin);
    }

    const handler = actions[data.action];
    if (!handler) {
        return;
    }

    try {
        const res = await handler(data);
        const json = await res.json();
        respond(null, json);
    } catch (err) {
        respond(err, null);
    }
});
