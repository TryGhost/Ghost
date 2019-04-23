/* global window document fetch */
const each = require('lodash/each');
const browserAuth = require('@tryghost/members-browser-auth');

module.exports.init = init;

function init({siteUrl}) {
    const auth = browserAuth({membersUrl: siteUrl + '/members'});

    const [hashMatch, hash, query] = window.location.hash.match(/^#([^?]+)\??(.*)$/) || [];

    if (hashMatch && hash === 'reset-password') {
        const [tokenMatch, token] = query.match(/token=([a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+)/) || [];
        if (tokenMatch) {
            return auth.resetPassword({token})
                .then((success) => {
                    window.location.hash = '';
                    return success;
                })
                .then(reload);
        }
    }

    auth.on('signedin', function () {
        auth.getSSRToken({fresh: true}).then(function (token) {
            createSession(token);
        });
    });

    auth.on('signedout', function () {
        destroySession();
    });

    function signout() {
        auth.signout()
            .then(() => {
                return destroySession();
            })
            .then(reload);
    }

    function signin() {
        auth.signin()
            .then(() => {
                return auth.getSSRToken({
                    fresh: true
                }).then(function (token) {
                    return createSession(token);
                });
            })
            .then(reload);
    }

    function signup({coupon = ''}) {
        auth.signup({coupon})
            .then(() => {
                return auth.getSSRToken({
                    fresh: true
                }).then(function (token) {
                    return createSession(token);
                });
            })
            .then(reload);
    }

    function upgrade() {
        auth.upgrade()
            .then(() => {
                return auth.getSSRToken({
                    fresh: true
                }).then(function (token) {
                    return createSession(token);
                });
            })
            .then(reload);
    }

    const signinEls = document.querySelectorAll('[data-members-signin]');
    const signupEls = document.querySelectorAll('[data-members-signup]');
    const upgradeEls = document.querySelectorAll('[data-members-upgrade]');
    const signoutEls = document.querySelectorAll('[data-members-signout]');

    each(signinEls, (el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            signin();
        });
    });

    each(signupEls, (el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            const coupon = el.dataset.membersCoupon;
            signup({coupon});
        });
    });

    each(upgradeEls, (el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            upgrade();
        });
    });

    each(signoutEls, (el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            signout();
        });
    });
}

function reload(success) {
    if (success) {
        window.location.reload();
    }
}

function createSession(token) {
    return fetch('/members/ssr', {
        method: 'post',
        credentials: 'include',
        body: token
    }).then(function (res) {
        return !!res.ok;
    });
}

function destroySession() {
    return fetch('/members/ssr', {
        method: 'delete'
    }).then(function (res) {
        return !!res.ok;
    });
}
