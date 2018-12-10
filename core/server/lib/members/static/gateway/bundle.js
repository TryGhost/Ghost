/* global window document location fetch */
(function () {
    if (window.parent === window) {
        return;
    }
    let storage;
    try {
        storage = window.localStorage;
    } catch (e) {
        storage = window.sessionStorage;
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

    // @TODO this needs to be configurable
    const membersApi = location.pathname.replace(/\/members\/gateway\/?$/, '/ghost/api/v2/members');
    function getToken({audience}) {
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
                if (res.status === 401) {
                    storage.removeItem('signedin');
                }
                return null;
            }
            storage.setItem('signedin', true);
            return res.text();
        });
    }

    addMethod('init', function init() {
        if (storage.getItem('signedin')) {
            window.parent.postMessage({event: 'signedin'}, origin);
        } else {
            window.parent.postMessage({event: 'signedout'}, origin);
        }

        getToken({audience: origin});
        return Promise.resolve();
    });

    addMethod('getToken', getToken);

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
            if (res.ok) {
                storage.setItem('signedin', true);
            }
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
            if (res.ok) {
                storage.setItem('signedin', true);
            }
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
            if (res.ok) {
                storage.removeItem('signedin');
            }
            return res.ok;
        });
    });

    addMethod('request-password-reset', function signout({email}) {
        return fetch(`${membersApi}/request-password-reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                email
            })
        }).then((res) => {
            return res.ok;
        });
    });

    addMethod('reset-password', function signout({token, password}) {
        return fetch(`${membersApi}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                token,
                password
            })
        }).then((res) => {
            if (res.ok) {
                storage.setItem('signedin', true);
            }
            return res.ok;
        });
    });

    window.addEventListener('storage', function (event) {
        if (event.storageArea !== storage) {
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
