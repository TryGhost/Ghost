const adminUrl = window.location.href.replace('auth-frame/', '');

window.addEventListener('message', async function (event) {
    if (event.origin !== '*') {
        // return;
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
        }), '*');
    }

    if (data.action === 'getUser') {
        try {
            const res = await fetch(
                adminUrl + 'api/canary/admin/users/me/'
            );
            const json = await res.json();
            respond(null, json);
        } catch (err) {
            respond(err, null);
        }
    }

    if (data.action === 'hideComment') {
        try {
            const res = await fetch(adminUrl + 'api/canary/admin/comments/' + data.id + '/', {
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
            const res = await fetch(adminUrl + 'api/canary/admin/comments/' + data.id + '/', {
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
