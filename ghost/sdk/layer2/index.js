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

        signin.addEventListener('click', function (event) {
            event.preventDefault();
            members.login()
                .then(members.getToken)
                .then(render);
        });

        signout.addEventListener('click', function (event) {
            event.preventDefault();
            members.logout()
                .then(members.getToken)
                .then(render);
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
