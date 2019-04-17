/* global window document fetch */
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
    const signupEls = document.querySelectorAll('[data-members-signup]');
    const upgradeEls = document.querySelectorAll('[data-members-upgrade]');
    const signoutEls = document.querySelectorAll('[data-members-signout]');

    function setCookie(token) {
        return fetch('/members/ssr', {
            method: 'post',
            credentials: 'include',
            body: token
        }).then(function (res) {
            return !!res.ok;
        });
    }

    function removeCookie() {
        return fetch('/members/ssr', {
            method: 'delete'
        }).then(function (res) {
            return !!res.ok;
        });
    }

    members.on('signedin', function () {
        members.getSSRToken({fresh: true}).then(function (token) {
            setCookie(token);
        });
    });

    members.on('signedout', function () {
        removeCookie();
    });

    function signout() {
        members.signout()
            .then(() => {
                return removeCookie();
            })
            .then(reload);
    }

    function signin() {
        members.signin()
            .then(() => {
                return members.getSSRToken({
                    fresh: true
                }).then(function (token) {
                    return setCookie(token);
                });
            })
            .then(reload);
    }

    function signup({coupon = ''}) {
        members.signup({coupon})
            .then(() => {
                return members.getSSRToken({
                    fresh: true
                }).then(function (token) {
                    return setCookie(token);
                });
            })
            .then(reload);
    }

    function upgrade() {
        members.upgrade()
            .then(() => {
                return members.getSSRToken({
                    fresh: true
                }).then(function (token) {
                    return setCookie(token);
                });
            })
            .then(reload);
    }

    for (let el of signinEls) {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            signin();
        });
    }

    for (let el of signupEls) {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            const coupon = el.dataset.membersCoupon;
            signup({coupon});
        });
    }

    for (let el of upgradeEls) {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            upgrade();
        });
    }

    for (let el of signoutEls) {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            signout();
        });
    }
}
