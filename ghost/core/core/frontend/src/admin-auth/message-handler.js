const adminUrl = window.location.href.replace('auth-frame/', '') + 'api/admin';

// At compile time, we'll replace the value with the actual origin.
const siteOrigin = '{{SITE_ORIGIN}}';

window.addEventListener('message', async function (event) {
    if (event.origin !== siteOrigin) {
        console.warn('Ignored message to admin auth iframe because of mismatch in origin', 'expected', siteOrigin, 'got', event.origin, 'with data', event.data);
        return;
    }
    let data = null;
    try {
        data = JSON.parse(event.data);
    } catch (err) {
        console.error(err);
    }

    function respond(error, result) {
        event.source.postMessage(JSON.stringify({
            uid: data.uid,
            error: error,
            result: result
        }), siteOrigin);
    }

    if (data.action === 'browseComments') {
        try {
            const {postId, params} = data;
            const res = await fetch(
                adminUrl + `/comments/post/${postId}/?${new URLSearchParams(params).toString()}`
            );
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }

    if (data.action === 'getReplies') {
        try {
            const {commentId, params} = data;
            const res = await fetch(
                adminUrl + `/comments/${commentId}/replies/?${new URLSearchParams(params).toString()}`
            );
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }

    if (data.action === 'readComment') {
        try {
            const {commentId, params} = data;
            const res = await fetch(adminUrl + '/comments/' + commentId + '/' + '?' + new URLSearchParams(params).toString());
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }
 
    if (data.action === 'getUser') {
        try {
            const res = await fetch(
                adminUrl + '/users/me/?include=roles'
            );
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }

    if (data.action === 'hideComment') {
        try {
            const res = await fetch(adminUrl + '/comments/' + data.id + '/', {
                method: 'PUT',
                body: JSON.stringify({
                    comments: [{
                        id: data.id,
                        status: 'hidden'
                    }]
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }

    if (data.action === 'showComment') {
        try {
            const res = await fetch(adminUrl + '/comments/' + data.id + '/', {
                method: 'PUT',
                body: JSON.stringify({
                    comments: [{
                        id: data.id,
                        status: 'published'
                    }]
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }
});
