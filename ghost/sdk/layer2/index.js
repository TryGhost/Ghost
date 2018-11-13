const Members = require('@tryghost/members-layer1');

const members = Members.create();

const show = el => el.style.display = 'block';
const hide = el => el.style.display = 'none';

module.exports = {
    getToken() {
        return members.getToken();
    },
    init() {
        const signin = document.querySelector('[data-members-signin]');
        const signout = document.querySelector('[data-members-signout]');

        const render = (signedIn) => {
            const promise = signedIn !== undefined ? Promise.resolve(signedIn) : members.getToken();
            return promise.then((token) => {
                if (token) {
                    show(signout);
                    hide(signin);
                } else {
                    show(signin);
                    hide(signout);
                }
            });
        };

        signin.addEventListener('click', (event) => {
            event.preventDefault();
            members.login()
                .then(render);
        });

        signout.addEventListener('click', (event) => {
            event.preventDefault();
            members.logout()
                .then((success) => {
                    render(!success);
                });
        });

        return render();
    }
};
