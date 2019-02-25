/* global atob window document location fetch */
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

    function isTokenExpired(token) {
        const claims = getClaims(token);

        if (!claims) {
            return true;
        }

        const expiry = claims.exp * 1000;
        const now = Date.now();

        const nearFuture = now + (30 * 1000);

        if (expiry < nearFuture) {
            return true;
        }

        return false;
    }

    function getClaims(token) {
        try {
            const [header, claims, signature] = token.split('.'); // eslint-disable-line no-unused-vars

            const parsedClaims = JSON.parse(atob(claims.replace('+', '-').replace('/', '_')));

            return parsedClaims;
        } catch (e) {
            return null;
        }
    }

    function getStoredToken(audience) {
        const tokenKey = 'members:token:aud:' + audience;
        const storedToken = storage.getItem(tokenKey);
        if (isTokenExpired(storedToken)) {
            const storedTokenKeys = getStoredTokenKeys();
            storage.setItem('members:tokens', JSON.stringify(storedTokenKeys.filter(key => key !== tokenKey)));
            storage.removeItem(tokenKey);
            return null;
        }
        return storedToken;
    }

    function getStoredTokenKeys() {
        try {
            return JSON.parse(storage.getItem('members:tokens') || '[]');
        } catch (e) {
            storage.removeItem('members:tokens');
            return [];
        }
    }

    function addStoredToken(audience, token) {
        const storedTokenKeys = getStoredTokenKeys();
        const tokenKey = 'members:token:aud:' + audience;

        storage.setItem(tokenKey, token);
        if (!storedTokenKeys.includes(tokenKey)) {
            storage.setItem('members:tokens', JSON.stringify(storedTokenKeys.concat(tokenKey)));
        }
    }

    function clearStorage() {
        storage.removeItem('signedin');
        const storedTokenKeys = getStoredTokenKeys();

        storedTokenKeys.forEach(function (key) {
            storage.removeItem(key);
        });

        storage.removeItem('members:tokens');
    }

    // @TODO this needs to be configurable
    const membersApi = location.pathname.replace(/\/members\/gateway\/?$/, '/ghost/api/v2/members');
    function getToken({audience, fresh}) {
        const storedToken = getStoredToken(audience);

        if (storedToken && !fresh) {
            return Promise.resolve(storedToken);
        }

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
        }).then(function (token) {
            if (token) {
                addStoredToken(audience, token);
            }
            return token;
        });
    }

    addMethod('init', function init() {
        if (storage.getItem('signedin')) {
            window.parent.postMessage({event: 'signedin'}, origin);
        } else {
            getToken({audience: origin, fresh: true});
        }

        return Promise.resolve();
    });

    addMethod('getToken', getToken);

    addMethod('createSubscription', function createSubscription({adapter, plan, stripeToken}) {
        return fetch(`${membersApi}/subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                adapter,
                plan,
                stripeToken
            })
        }).then((res) => {
            if (res.ok) {
                storage.setItem('signedin', true);
            }
            return res.ok;
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
                clearStorage();
            }
            return res.ok;
        });
    });

    addMethod('requestPasswordReset', function requestPasswordReset({email}) {
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

    addMethod('resetPassword', function resetPassword({token, password}) {
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

    addMethod('getConfig', function getConfig() {
        return fetch(`${membersApi}/config`, {
            method: 'GET'
        }).then((res) => {
            return res.json();
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
