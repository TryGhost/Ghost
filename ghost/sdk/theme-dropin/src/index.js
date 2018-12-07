const DomReady = require('domready');
const GhostContentApi = require('@tryghost/content-api');
const layer2 = require('@tryghost/members-layer2');

function reload() {
    window.location.reload();
}

function show (el) {
    el.style.display = 'block';
}
function hide (el) {
    el.style.display = 'none';
}

const version = 'v2';

DomReady(function () {
    const members = layer2({membersUrl: window.membersUrl});

    const [hashMatch, hash, query] = window.location.hash.match(/^#([^?]+)\??(.*)$/) || [];

    if (hashMatch && hash === 'reset-password') {
        const [tokenMatch, token] = query.match(/token=([a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+)/) || [];
        if (tokenMatch) {
            return members.resetPassword({token})
                .then(() => {
                    window.location.hash = '';
                })
                .then(reload);
        }
    }

    const membersContentElements = Array.from(document.querySelectorAll("[data-members]")) // TODO use data-members-content;

    var signinBtn = document.querySelector('[data-members-signin]');
    var signinCta = document.querySelector('[data-members-signin-cta]');
    var signoutBtn = document.querySelector('[data-members-signout]');

    members.on('signedin', function () {
        show(signoutBtn);
        hide(signinBtn);
    });

    members.on('signedout', function () {
        show(signinBtn);
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

    signoutBtn.addEventListener('click', signout);
    signinBtn.addEventListener('click', signin);
    signinCta.addEventListener('click', signin);

    membersContentElements.forEach(function (element) {
        console.log(element);
        const resourceType = element.getAttribute('data-members-resource-type');
        const resourceId = element.getAttribute('data-members-resource-id');
        const host = element.getAttribute('data-members-content-host');

        const api = GhostContentApi.create({
            host,
            version
        });

        const audience = new URL(host).origin
        console.log(audience);
        members.getToken({audience}).then((token) => {
            console.log(token);
            if (!token) {
                return;
            }

            console.log({resourceType, resourceId});

            api[resourceType].read({ id: resourceId }, {}, token).then(({html}) => {
                element.innerHTML = html;
            }).catch((err) => {
                element.innerHTML = err.message;
            });
        });
    });
});
