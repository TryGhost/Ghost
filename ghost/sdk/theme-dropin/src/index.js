/* global window document atob */
const domready = require('domready');
const layer2 = require('@tryghost/members-layer2');

domready(setupMembersListeners);

function reload(success) {
    if (success) {
        window.location.reload();
    }
}

function setupMembersListeners() {
    const members = layer2({membersUrl: window.membersUrl});
    const tokenAudience = new URL(window.location.href).origin;

    const [hashMatch, hash, query] = window.location.hash.match(/^#([^?]+)\??(.*)$/) || [];

    if (hashMatch && hash === 'reset-password') {
        const [tokenMatch, token] = query.match(/token=([a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+)/) || [];
        if (tokenMatch) {
            return members.resetPassword({token})
                .then((success) => {
                    window.location.hash = '';
                    return success;
                })
                .then(reload);
        }
    }

    const signinEls = document.querySelectorAll('[data-members-signin]');
    const upgradeEls = document.querySelectorAll('[data-members-upgrade]');
    const signoutEls = document.querySelectorAll('[data-members-signout]');

    function setCookie(token) {
        const claims = getClaims(token);
        const expiry = new Date(claims.exp * 1000);
        document.cookie = 'member=' + token + ';Path=/;expires=' + expiry.toUTCString();
    }

    function removeCookie() {
        document.cookie = 'member=null;Path=/;max-age=0';
    }

    members.on('signedin', function () {
        const currentCookies = document.cookie;
        const [hasCurrentToken, currentToken] = currentCookies.match(/member=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*)/) || [null]; // eslint-disable-line no-unused-vars

        if (currentToken && isTokenExpired(currentToken)) {
            return members.signout();
        }

        members.getToken({
            audience: tokenAudience
        }).then(function (token) {
            setCookie(token);
        });
    });

    members.on('signedout', function () {
        removeCookie();
    });

    function signout(event) {
        event.preventDefault();
        members.signout()
            .then(() => {
                removeCookie();
                return true;
            })
            .then(reload);
    }

    function signin(event) {
        event.preventDefault();
        members.signin()
            .then(() => {
                return members.getToken({
                    audience: tokenAudience
                }).then(function (token) {
                    setCookie(token);
                    return true;
                });
            })
            .then(reload);
    }

    function upgrade(event) {
        event.preventDefault();
        members.upgrade()
            .then(reload);
    }

    for (let el of signinEls) {
        el.addEventListener('click', signin);
    }

    for (let el of upgradeEls) {
        el.addEventListener('click', upgrade);
    }

    for (let el of signoutEls) {
        el.addEventListener('click', signout);
    }
}

function isTokenExpired(token) {
    const claims = getClaims(token);

    if (!claims) {
        return true;
    }

    const expiry = claims.exp * 1000;
    const now = Date.now();

    if (expiry < now) {
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
