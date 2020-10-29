function setupGhostApi({siteUrl = window.location.origin}) {
    const apiPath = 'members/api';

    function endpointFor({type, resource}) {
        if (type === 'members') {
            return `${siteUrl.replace(/\/$/, '')}/${apiPath}/${resource}/`;
        }
    }

    function makeRequest({url, method, headers = {}, credentials, body}) {
        const options = {
            method,
            headers,
            credentials,
            body
        };
        return fetch(url, options);
    }
    const api = {};

    api.site = {
        read() {
            const url = endpointFor({type: 'members', resource: 'site'});
            return makeRequest({
                url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(function (res) {
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to fetch site data');
                }
            });
        }
    };

    api.member = {
        identity() {
            const url = endpointFor({type: 'members', resource: 'session'});
            return makeRequest({
                url,
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }
                return res.text();
            });
        },

        sessionData() {
            const url = endpointFor({type: 'members', resource: 'member'});
            return makeRequest({
                url,
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }
                return res.json();
            });
        },

        update({name, subscribed}) {
            const url = endpointFor({type: 'members', resource: 'member'});
            return makeRequest({
                url,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name,
                    subscribed
                })
            }).then(function (res) {
                if (!res.ok) {
                    return null;
                }
                return res.json();
            });
        },

        sendMagicLink({email, emailType, labels, name, oldEmail}) {
            const url = endpointFor({type: 'members', resource: 'send-magic-link'});
            return makeRequest({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    oldEmail,
                    emailType,
                    labels,
                    requestSrc: 'portal'
                })
            }).then(function (res) {
                if (res.ok) {
                    return 'Success';
                } else {
                    throw new Error('Failed to send magic link email');
                }
            });
        },

        signout() {
            const url = endpointFor({type: 'members', resource: 'session'});
            return makeRequest({
                url,
                method: 'DELETE'
            }).then(function (res) {
                if (res.ok) {
                    window.location.replace(siteUrl);
                    return 'Success';
                } else {
                    throw new Error('Failed to signout');
                }
            });
        },

        async checkoutPlan({plan, cancelUrl, successUrl, email: customerEmail, name, metadata = {}}) {
            const identity = await api.member.identity();
            const url = endpointFor({type: 'members', resource: 'create-stripe-checkout-session'});
            if (!successUrl) {
                const checkoutSuccessUrl = new URL(siteUrl);
                checkoutSuccessUrl.searchParams.set('portal-stripe', 'success');
                successUrl = checkoutSuccessUrl.href;
            }

            if (!cancelUrl) {
                const checkoutCancelUrl = new URL(siteUrl);
                checkoutCancelUrl.searchParams.set('portal-stripe', 'cancel');
                cancelUrl = checkoutCancelUrl.href;
            }
            return makeRequest({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plan: plan,
                    identity: identity,
                    metadata: {
                        name,
                        ...metadata
                    },
                    successUrl,
                    cancelUrl,
                    customerEmail: customerEmail
                })
            }).then(function (res) {
                if (!res.ok) {
                    throw new Error('Could not create stripe checkout session');
                }
                return res.json();
            }).then(function (result) {
                const stripe = window.Stripe(result.publicKey);
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
        },

        async editBilling({successUrl, cancelUrl}) {
            const identity = await api.member.identity();
            const url = endpointFor({type: 'members', resource: 'create-stripe-update-session'});
            if (!successUrl) {
                const checkoutSuccessUrl = new URL(siteUrl);
                checkoutSuccessUrl.searchParams.set('portal-stripe', 'success');
                successUrl = checkoutSuccessUrl.href;
            }

            if (!cancelUrl) {
                const checkoutCancelUrl = new URL(siteUrl);
                checkoutCancelUrl.searchParams.set('portal-stripe', 'cancel');
                cancelUrl = checkoutCancelUrl.href;
            }
            return makeRequest({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: identity,
                    successUrl,
                    cancelUrl
                })
            }).then(function (res) {
                if (!res.ok) {
                    throw new Error('Could not create stripe checkout session');
                }
                return res.json();
            }).then(function (result) {
                const stripe = window.Stripe(result.publicKey);
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
        },
        async updateSubscription({subscriptionId, planName, cancelAtPeriodEnd}) {
            const identity = await api.member.identity();
            const url = endpointFor({type: 'members', resource: 'subscriptions'}) + subscriptionId + '/';
            return makeRequest({
                url,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cancel_at_period_end: cancelAtPeriodEnd,
                    identity: identity,
                    planName
                })
            });
        }
    };

    api.init = async () => {
        const {site} = await api.site.read();
        const member = await api.member.sessionData();
        return {site, member};
    };

    return api;
}

export default setupGhostApi;
