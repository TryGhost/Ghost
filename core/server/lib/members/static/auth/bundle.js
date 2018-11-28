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

    document.querySelector('form').addEventListener('submit', function (event) {
        event.preventDefault();
        const email = event.target.elements.email.value;
        const password = event.target.elements.password.value;
        signin(email, password);
    });
})();
