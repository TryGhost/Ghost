var Members = require('@tryghost/members-layer1');

function show (el) {
    el.style.display = 'block';
}
function hide (el) {
    el.style.display = 'none';
}

module.exports = {
    init: function init(options) {
        var members = Members.create();

        var signin = document.querySelector('[data-members-signin]');
        var signinCta = document.querySelector('[data-members-signin-cta]');
        var signout = document.querySelector('[data-members-signout]');

        function render (token) {
            if (token) {
                show(signout);
                hide(signin);
            } else {
                show(signin);
                hide(signout);
            }
            return token;
        }

        function reload () {
            if (options.reload) {
                window.location.reload()
            }
        }

        function onSigninEvent (event) {
            event.preventDefault();
            members.login()
                .then(members.getToken)
                .then(render)
                .then(reload);
        }

        signin.addEventListener('click', onSigninEvent);
        signinCta && signinCta.addEventListener('click', onSigninEvent);

        signout.addEventListener('click', function (event) {
            event.preventDefault();
            members.logout()
                .then(members.getToken)
                .then(render)
                .then(reload);
        });

        return members.getToken()
            .then(render)
            .then(function () {
                return {
                    getToken: members.getToken
                };
            });
    }
};
