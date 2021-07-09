/* eslint-disable no-console */

const {getQueryPrice} = require('./utils/helpers');

function handleDataAttributes({siteUrl, site, member}) {
    siteUrl = siteUrl.replace(/\/$/, '');
    Array.prototype.forEach.call(document.querySelectorAll('form[data-members-form]'), function (form) {
        let errorEl = form.querySelector('[data-members-error]');
        function submitHandler(event) {
            form.removeEventListener('submit', submitHandler);
            event.preventDefault();
            if (errorEl) {
                errorEl.innerText = '';
            }
            form.classList.remove('success', 'invalid', 'error');
            let emailInput = event.target.querySelector('input[data-members-email]');
            let nameInput = event.target.querySelector('input[data-members-name]');
            let email = emailInput?.value;
            let name = (nameInput && nameInput.value) || undefined;
            let emailType = undefined;
            let labels = [];

            let labelInputs = event.target.querySelectorAll('input[data-members-label]') || [];
            for (let i = 0; i < labelInputs.length; ++i) {
                labels.push(labelInputs[i].value);
            }

            if (form.dataset.membersForm) {
                emailType = form.dataset.membersForm;
            }

            form.classList.add('loading');
            fetch(`${siteUrl}/members/api/send-magic-link/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    emailType: emailType,
                    labels: labels,
                    name: name
                })
            }).then(function (res) {
                form.addEventListener('submit', submitHandler);
                form.classList.remove('loading');
                if (res.ok) {
                    form.classList.add('success');
                } else {
                    if (errorEl) {
                        errorEl.innerText = 'There was an error sending the email, please try again';
                    }
                    form.classList.add('error');
                }
            });
        }
        form.addEventListener('submit', submitHandler);
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-members-plan]'), function (el) {
        let errorEl = el.querySelector('[data-members-error]');
        function clickHandler(event) {
            el.removeEventListener('click', clickHandler);
            event.preventDefault();
            let plan = el.dataset.membersPlan;
            let priceId = '';
            if (plan) {
                const price = getQueryPrice({site, priceId: plan.toLowerCase()});
                priceId = price ? price.id : plan;
            }
            let successUrl = el.dataset.membersSuccess;
            let cancelUrl = el.dataset.membersCancel;
            let checkoutSuccessUrl;
            let checkoutCancelUrl;

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
            const metadata = member ? {
                checkoutType: 'upgrade'
            } : {};
            fetch(`${siteUrl}/members/api/session`, {
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }
                return res.text();
            }).then(function (identity) {
                return fetch(`${siteUrl}/members/api/create-stripe-checkout-session/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        priceId: priceId,
                        identity: identity,
                        successUrl: checkoutSuccessUrl,
                        cancelUrl: checkoutCancelUrl,
                        metadata
                    })
                }).then(function (res) {
                    if (!res.ok) {
                        throw new Error('Could not create stripe checkout session');
                    }
                    return res.json();
                });
            }).then(function (result) {
                let stripe = window.Stripe(result.publicKey);
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
        let errorEl = el.querySelector('[data-members-error]');
        let membersSuccess = el.dataset.membersSuccess;
        let membersCancel = el.dataset.membersCancel;
        let successUrl;
        let cancelUrl;

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
            fetch(`${siteUrl}/members/api/session`, {
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }
                return res.text();
            }).then(function (identity) {
                return fetch(`${siteUrl}/members/api/create-stripe-update-session/`, {
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
                let stripe = window.Stripe(result.publicKey);
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
            fetch(`${siteUrl}/members/api/session`, {
                method: 'DELETE'
            }).then(function (res) {
                if (res.ok) {
                    window.location.replace(siteUrl);
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
        let errorEl = el.parentElement.querySelector('[data-members-error]');
        function clickHandler(event) {
            el.removeEventListener('click', clickHandler);
            event.preventDefault();
            el.classList.remove('error');
            el.classList.add('loading');

            let subscriptionId = el.dataset.membersCancelSubscription;

            if (errorEl) {
                errorEl.innerText = '';
            }

            return fetch(`${siteUrl}/members/api/session`, {
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }

                return res.text();
            }).then(function (identity) {
                return fetch(`${siteUrl}/members/api/subscriptions/${subscriptionId}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        identity: identity,
                        smart_cancel: true
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
        let errorEl = el.parentElement.querySelector('[data-members-error]');
        function clickHandler(event) {
            el.removeEventListener('click', clickHandler);
            event.preventDefault();
            el.classList.remove('error');
            el.classList.add('loading');

            let subscriptionId = el.dataset.membersContinueSubscription;

            if (errorEl) {
                errorEl.innerText = '';
            }

            return fetch(`${siteUrl}/members/api/session`, {
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }

                return res.text();
            }).then(function (identity) {
                return fetch(`${siteUrl}/members/api/subscriptions/${subscriptionId}/`, {
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
}

module.exports = handleDataAttributes;
