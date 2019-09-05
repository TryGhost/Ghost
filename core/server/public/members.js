const forms = [...document.querySelectorAll('form[data-members-form]')];
forms.forEach(function (form){
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        form.classList.remove('success', 'invalid', 'error');
        const input = event.target.querySelector('input[data-members-email]');
        const email = input.value;

        if (!email.includes('@')) {
            form.classList.add('invalid')
            return;
        }

        fetch('{{admin-url}}/api/canary/members/send-magic-link/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email
            })
        }).then(function (res) {
            if (res.ok) {
                form.classList.add('success')
            } else {
                form.classList.add('error')
            }
        });
    });
});

const magicLinkRegEx = /token=([a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+)/;
const [isMagicLink, token] = location.search.match(magicLinkRegEx) || [false, null];

if (isMagicLink) {
    fetch('{{blog-url}}/members/ssr', {
        method: 'POST',
        body: token
    }).then(function (res) {
        if (res.ok) {
            window.location.search = window.location.search.replace(magicLinkRegEx, '');
        }
    });
}
