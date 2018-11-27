/* global window document location fetch */
(function () {
    if (window.parent === window) {
        return;
    }
    const storage = window.localStorage;
    const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');

    function signin(username, password) {
        fetch(`${membersApi}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username, password
            })
        }).then((res) => {
            if (!res.ok) {
                throw new Error(res.statusCode);
            }
            storage.setItem('signedin', true);
        });
    }

    document.querySelector('button.signin').addEventListener('click', function () {
        signin();
    });
})();
