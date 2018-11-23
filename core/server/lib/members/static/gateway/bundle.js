/* global window document location fetch */
(function () {
    if (window.parent === window) {
        return;
    }
    const origin = new URL(document.referrer).origin;
    const handlers = {};
    function addMethod(method, fn) {
        handlers[method] = function ({uid, options}) {
            fn(options)
                .then(function (data) {
                    window.parent.postMessage({uid, data}, origin);
                })
                .catch(function (error) {
                    window.parent.postMessage({uid, error: error.message}, origin);
                });
        };
    }

    const membersApi = location.pathname.replace(/\/members\/gateway\/?$/, '/ghost/api/v2/members');

    addMethod('getToken', function getToken(/*options*/) {
        return fetch(`${membersApi}/token`, {
            method: 'POST'
        }).then((res) => {
            return res.text();
        });
    });

    window.addEventListener('message', function (event) {
        if (event.origin !== origin) {
            return;
        }
        if (!event.data || !event.data.uid) {
            return;
        }
        if (!handlers[event.data.method]) {
            return window.parent.postMessage({
                uid: event.data.uid,
                error: 'Unknown method'
            }, origin);
        }
        handlers[event.data.method](event.data);
    });
})();
