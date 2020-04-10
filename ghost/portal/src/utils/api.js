function createSignoutApi(blogUrl) {
    return function () {
        fetch(`${blogUrl}/members/ssr`, {
            method: 'DELETE'
        }).then(function (res) {
            if (res.ok) {
                window.location.reload();
                return 'Success';
            } else {
                console.log('Failed to signout!', res);
            }
        });
    };
}

function createSendMagicLinkApi(adminUrl) {
    return function ({email, emailType = 'signup', labels = []}) {
        fetch(`${adminUrl}/api/canary/members/send-magic-link/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                emailType,
                labels
            })
        }).then(function (res) {
            if (res.ok) {
                return 'Success';
            } else {
                console.log('Failed to send magic link!', res);
            }
        });
    };
}

function createCheckoutPlanApi(blogUrl) {
    return function ({plan, checkoutCancelUrl, checkoutSuccessUrl}) {
        fetch(`${blogUrl}/members/ssr`, {
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
            var stripe = window.Stripe(result.publicKey);
            return stripe.redirectToCheckout({
                sessionId: result.sessionId
            });
        }).then(function (result) {
            if (result.error) {
                throw new Error(result.error.message);
            }
        }).catch(function (err) {
            throw err;
        });
    };
}

/** blogUrl and adminUrl are being passed by theme */
function setupMembersApi({blogUrl, adminUrl}) {
    return {
        sendMagicLink: createSendMagicLinkApi(adminUrl),
        signout: createSignoutApi(blogUrl),
        checkoutPlan: createCheckoutPlanApi(blogUrl)
    };
}

module.exports = setupMembersApi;
