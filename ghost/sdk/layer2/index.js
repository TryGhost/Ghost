var Members = require('@tryghost/members-layer1');

var members = Members.create();

function show (el) {
    el.style.display = 'block';
}
function hide (el) {
    el.style.display = 'none';
}

function reload() {
    location.reload();
}

function setCookie(token) {
    if (!token) {
        document.cookie = 'member=null;path=/;samesite;max-age=0';
    } else {
        document.cookie = ['member=', token, ';path=/;samesite;'].join('');
    }
    return token;
}

module.exports = {
    init: function init() {
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
                .then(setCookie)
                .then(reload);
        });

        signout.addEventListener('click', function (event) {
            event.preventDefault();
            members.logout()
                .then(members.getToken)
                .then(setCookie)
                .then(reload);
        });

        return members.getToken()
            .then(setCookie)
            .then(render);
    }
};
