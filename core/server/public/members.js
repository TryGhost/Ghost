Array.prototype.forEach.call(document.querySelectorAll('form[data-members-form]'), function (form){
    var errorEl = form.querySelector('[data-members-error]');
    function submitHandler(event) {
        form.removeEventListener('submit', submitHandler);
        event.preventDefault();
        if (errorEl) {
            errorEl.innerText = '';
        }
        form.classList.remove('success', 'invalid', 'error');
        var input = event.target.querySelector('input[data-members-email]');
        var email = input.value;
        var emailType = undefined;

        if (form.dataset.membersForm) {
            emailType = form.dataset.membersForm;
        }

        if (!email.includes('@')) {
            form.classList.add('invalid')
            form.addEventListener('submit', submitHandler);
            return;
        }

        form.classList.add('loading');
        fetch('{{admin-url}}/api/canary/members/send-magic-link/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                emailType: emailType
            })
        }).then(function (res) {
            form.addEventListener('submit', submitHandler);
            form.classList.remove('loading');
            if (res.ok) {
                form.classList.add('success')
            } else {
                if (errorEl) {
                    errorEl.innerText = 'There was an error sending the email, please try again';
                }
                form.classList.add('error')
            }
        });
    }
    form.addEventListener('submit', submitHandler);
});

Array.prototype.forEach.call(document.querySelectorAll('[data-members-plan]'), function (el) {
    var errorEl = el.querySelector('[data-members-error]');
    function clickHandler(event) {
        el.removeEventListener('click', clickHandler);
        event.preventDefault();

        var plan = el.dataset.membersPlan;
        var successUrl = el.dataset.membersSuccess;
        var cancelUrl = el.dataset.membersCancel;
        var checkoutSuccessUrl;
        var checkoutCancelUrl;

        if (successUrl) {
            checkoutSuccessUrl = (new URL(successUrl, window.location.href)).href;
        }

        if (cancelUrl) {
            checkoutCancelUrl = (new URL(cancelUrl, window.location.href)).href;
        }

        if (errorEl) {
            errorEl.innerText = '';
        }
        el.classList.add('loading');
        fetch('{{blog-url}}/members/ssr', {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
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
                    identity: identity,
                    successUrl: checkoutSuccessUrl,
                    cancelUrl: checkoutCancelUrl
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
        }).then(function (result) {
            if (result.error) {
                throw new Error(result.error.message);
            }
        }).catch(function (err) {
            console.error(err);
            el.addEventListener('click', clickHandler);
            el.classList.remove('loading');
            if (errorEl) {
                errorEl.innerText = err.message;
            }
            el.classList.add('error');
        });
    }
    el.addEventListener('click', clickHandler);
});

Array.prototype.forEach.call(document.querySelectorAll('[data-members-signout]'), function (el) {
    function clickHandler(event) {
        el.removeEventListener('click', clickHandler);
        event.preventDefault();
        el.classList.remove('error');
        el.classList.add('loading');
        fetch('{{blog-url}}/members/ssr', {
            method: 'DELETE'
        }).then(function (res) {
            if (res.ok) {
                window.location.reload();
            } else {
                el.addEventListener('click', clickHandler);
                el.classList.remove('loading');
                el.classList.add('error');
            }
        });
    }
    el.addEventListener('click', clickHandler);
});

var url = new URL(window.location);
if (url.searchParams.get('token')) {
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.href);
}
