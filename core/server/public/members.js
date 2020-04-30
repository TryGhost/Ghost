/* eslint-disable no-var */
Array.prototype.forEach.call(document.querySelectorAll('form[data-members-form]'), function (form) {
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
        var labels = [];

        var labelInputs = event.target.querySelectorAll('input[data-members-label]') || [];
        for (var i = 0;i < labelInputs.length; ++i) {
            labels.push(labelInputs[i].value);
        }

        if (form.dataset.membersForm) {
            emailType = form.dataset.membersForm;
        }

        form.classList.add('loading');
        fetch('{{blog-url}}/members/api/send-magic-link/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                emailType: emailType,
                labels: labels
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
        fetch('{{blog-url}}/members/api/session', {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
            }
            return res.text();
        }).then(function (identity) {
            return fetch('{{blog-url}}/members/api/create-stripe-checkout-session/', {
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

Array.prototype.forEach.call(document.querySelectorAll('[data-members-edit-billing]'), function (el) {
    var errorEl = el.querySelector('[data-members-error]');
    var membersSuccess = el.dataset.membersSuccess;
    var membersCancel = el.dataset.membersCancel;
    var successUrl;
    var cancelUrl;

    if (membersSuccess) {
        successUrl = (new URL(membersSuccess, window.location.href)).href;
    }

    if (membersCancel) {
        cancelUrl = (new URL(membersCancel, window.location.href)).href;
    }

    function clickHandler(event) {
        el.removeEventListener('click', clickHandler);
        event.preventDefault();

        if (errorEl) {
            errorEl.innerText = '';
        }
        el.classList.add('loading');
        fetch('{{blog-url}}/members/api/session', {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
            }
            return res.text();
        }).then(function (identity) {
            return fetch('{{blog-url}}/members/api/create-stripe-update-session/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: identity,
                    successUrl: successUrl,
                    cancelUrl: cancelUrl
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
        fetch('{{blog-url}}/members/api/session', {
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

Array.prototype.forEach.call(document.querySelectorAll('[data-members-cancel-subscription]'), function (el) {
    var errorEl = el.parentElement.querySelector('[data-members-error]');
    function clickHandler(event) {
        el.removeEventListener('click', clickHandler);
        event.preventDefault();
        el.classList.remove('error');
        el.classList.add('loading');

        var subscriptionId = el.dataset.membersCancelSubscription;

        if (errorEl) {
            errorEl.innerText = '';
        }

        return fetch('{{blog-url}}/members/api/session', {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
            }

            return res.text();
        }).then(function (identity)  {
            return fetch('{{blog-url}}/members/api/subscriptions/' + subscriptionId + '/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: identity,
                    cancel_at_period_end: true
                })
            });
        }).then(function (res) {
            if (res.ok) {
                window.location.reload();
            } else {
                el.addEventListener('click', clickHandler);
                el.classList.remove('loading');
                el.classList.add('error');

                if (errorEl) {
                    errorEl.innerText = 'There was an error cancelling your subscription, please try again.';
                }
            }
        });
    }
    el.addEventListener('click', clickHandler);
});

Array.prototype.forEach.call(document.querySelectorAll('[data-members-continue-subscription]'), function (el) {
    var errorEl = el.parentElement.querySelector('[data-members-error]');
    function clickHandler(event) {
        el.removeEventListener('click', clickHandler);
        event.preventDefault();
        el.classList.remove('error');
        el.classList.add('loading');

        var subscriptionId = el.dataset.membersContinueSubscription;

        if (errorEl) {
            errorEl.innerText = '';
        }

        return fetch('{{blog-url}}/members/api/session', {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
            }

            return res.text();
        }).then(function (identity)  {
            return fetch('{{blog-url}}/members/api/subscriptions/' + subscriptionId + '/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: identity,
                    cancel_at_period_end: false
                })
            });
        }).then(function (res) {
            if (res.ok) {
                window.location.reload();
            } else {
                el.addEventListener('click', clickHandler);
                el.classList.remove('loading');
                el.classList.add('error');

                if (errorEl) {
                    errorEl.innerText = 'There was an error continuing your subscription, please try again.';
                }
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
