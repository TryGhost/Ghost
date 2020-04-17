function createSignoutApi(siteUrl) {
    return function () {
        return fetch(`${siteUrl}/members/ssr`, {
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
        return fetch(`${adminUrl}/api/canary/members/send-magic-link/`, {
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
                return 'Failed to send magic link';
            }
        });
    };
}

function createMemberIdentityApi(siteUrl) {
    return function () {
        return fetch(`${siteUrl}/members/ssr`, {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
            }
            return res.text();
        });
    };
}

function createSiteDataApi(adminUrl) {
    return function () {
        return fetch(`${adminUrl}/api/canary/admin/site/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(function (res) {
            if (res.ok) {
                return res.json();
            } else {
                return 'Failed to fetch site data';
            }
        });
    };
}

function createCheckoutPlanApi(siteUrl, adminUrl) {
    return function ({plan, checkoutCancelUrl, checkoutSuccessUrl}) {
        return fetch(`${siteUrl}/members/ssr`, {
            credentials: 'same-origin'
        }).then(function (res) {
            if (!res.ok) {
                return null;
            }
            return res.text();
        }).then(function (identity) {
            return fetch(`${adminUrl}/api/canary/members/create-stripe-checkout-session/`, {
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

/** siteUrl and adminUrl are being passed by theme */
function setupMembersApi({siteUrl, adminUrl}) {
    return {
        sendMagicLink: createSendMagicLinkApi(adminUrl),
        signout: createSignoutApi(siteUrl),
        checkoutPlan: createCheckoutPlanApi(siteUrl, adminUrl),
        getMemberIdentity: createMemberIdentityApi(siteUrl),
        getSiteData: createSiteDataApi(adminUrl)
    };
}

module.exports = setupMembersApi;
