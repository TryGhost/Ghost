/* global window document location fetch */
(function () {
    if (window.parent === window) {
        return;
    }
    const storage = window.localStorage;
    const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');

    function signin(email, password) {
        fetch(`${membersApi}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email, password
            })
        }).then((res) => {
            if (!res.ok) {
                throw new Error(res.statusCode);
            }
            storage.setItem('signedin', true);
        });
    }

    document.querySelector('form.signin').addEventListener('submit', function (event) {
        event.preventDefault();
        const email = event.target.elements.email.value;
        const password = event.target.elements.password.value;
        signin(email, password);
    });

    function signup(name, email, password) {
        fetch(`${membersApi}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name, email, password
            })
        }).then((res) => {
            if (!res.ok) {
                throw new Error(res.statusCode);
            }
            storage.setItem('signedin', true);
        });
    }

    document.querySelector('form.signup').addEventListener('submit', function (event) {
        event.preventDefault();
        const name = event.target.elements.name.value;
        const email = event.target.elements.email.value;
        const password = event.target.elements.password.value;
        signup(name, email, password);
    });
})();
