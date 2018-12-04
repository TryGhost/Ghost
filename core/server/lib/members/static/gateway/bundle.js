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

    addMethod('getToken', function getToken({audience}) {
        return fetch(`${membersApi}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                audience: audience || origin
            })
        }).then((res) => {
            if (!res.ok) {
                window.localStorage.removeItem('signedin');
                return null;
            }
            return res.text();
        });
    });

    addMethod('signin', function signin({email, password}) {
        return fetch(`${membersApi}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                email,
                password
            })
        }).then((res) => {
            return res.ok;
        });
    });

    addMethod('signup', function signin({name, email, password}) {
        return fetch(`${membersApi}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                name,
                email,
                password
            })
        }).then((res) => {
            return res.ok;
        });
    });

    addMethod('signout', function signout(/*options*/) {
        return fetch(`${membersApi}/signout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin
            })
        }).then((res) => {
            window.localStorage.removeItem('signedin');
            return res.ok;
        });
    });

    window.addEventListener('storage', function (event) {
        if (event.storageArea !== window.localStorage) {
            return;
        }
        const newValue = event.newValue;
        const oldValue = event.oldValue;
        if (event.key === 'signedin') {
            if (newValue && !oldValue) {
                return window.parent.postMessage({event: 'signedin'}, origin);
            }
            if (!newValue && oldValue) {
                return window.parent.postMessage({event: 'signedout'}, origin);
            }
        }
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
