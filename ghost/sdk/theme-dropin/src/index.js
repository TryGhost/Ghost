/* global window document */
const DomReady = require('domready');
const GhostContentApi = require('@tryghost/content-api');
const layer2 = require('@tryghost/members-layer2');

function reload(success) {
    if (success) {
        window.location.reload();
    }
}

function show(el) {
    if (el) {
        el.style.display = 'block';
    }
}
function hide(el) {
    if (el) {
        el.style.display = 'none';
    }
}

const version = 'v2';

DomReady(function () {
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

    const membersContentElements = Array.from(document.querySelectorAll('[data-members-content]'));

    const signinBtn = document.querySelector('[data-members-signin]');
    const signinCta = document.querySelector('[data-members-signin-cta]');
    const upgradeCta = document.querySelector('[data-members-upgrade-cta]');
    const signoutBtn = document.querySelector('[data-members-signout]');

    const showForbidden = document.querySelector('[data-members-show-forbidden]');
    const showUnauthorized = document.querySelector('[data-members-show-unauthorized]');

    hide(showForbidden);
    hide(showUnauthorized);

    members.on('signedin', function () {
        show(signoutBtn);
        show(upgradeCta);
        hide(signinCta);
        hide(signinBtn);
    });

    members.on('signedout', function () {
        show(signinBtn);
        show(signinCta);
        hide(upgradeCta);
        hide(signoutBtn);
    });

    function signout(event) {
        event.preventDefault();
        members.signout()
            .then(reload);
    }

    function signin(event) {
        event.preventDefault();
        members.signin()
            .then(reload);
    }

    function upgrade(event) {
        event.preventDefault();
        members.upgrade()
            .then(reload);
    }

    signoutBtn.addEventListener('click', signout);
    signinBtn.addEventListener('click', signin);
    signinCta.addEventListener('click', signin);
    upgradeCta.addEventListener('click', upgrade);

    membersContentElements.forEach(function (element) {
        const resourceType = element.getAttribute('data-members-resource-type');
        const resourceId = element.getAttribute('data-members-resource-id');
        const host = element.getAttribute('data-members-content-host');

        const api = GhostContentApi({
            host,
            version
        });

        const audience = new URL(host).origin;
        members.getToken({audience}).then((token) => {
            if (!token) {
                show(showUnauthorized);
                return;
            }

            api[resourceType].read({id: resourceId}, {}, token).then(({html}) => {
                if (html) {
                    element.innerHTML = html;
                } else {
                    show(showForbidden);
                }
            }).catch((err) => {
                element.innerHTML = err.message;
            });
        });
    });
});
