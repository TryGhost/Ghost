Array.prototype.forEach.call(document.querySelectorAll('form[data-members-form]'), function (form){
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        form.classList.remove('success', 'invalid', 'error');
        var input = event.target.querySelector('input[data-members-email]');
        var email = input.value;

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
                email: email
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

Array.prototype.forEach.call(document.querySelectorAll('[data-members-subscription]'), function (button) {
    button.addEventListener('click', function (event) {
        event.preventDefault();

        var plan = event.target.dataset.membersSubscriptionPlan;

        fetch('{{blog-url}}/members/ssr', {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                throw new Error('Could not get identity token');
            }
            return res.text();
        }).then(function (identity) {
            return fetch('{{admin-url}}/api/canary/members/create-stripe-checkout-session/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plan: plan,
                    identity: identity
                })
            }).then(function (res) {
                if (!res.ok) {
                    throw new Error('Could not create stripe checkout session');
                }
                return res.json();
            });
        }).then(function (result) {
            var stripe = Stripe(result.publicKey);
            return stripe.redirectToCheckout({
                sessionId: result.sessionId
            });
        });
    });
});

var magicLinkRegEx = /token=([a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+)/;
var match = location.search.match(magicLinkRegEx);
var isMagicLink = !!match
var token = match && match[1];

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
