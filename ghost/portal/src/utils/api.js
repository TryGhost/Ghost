import * as Fixtures from './fixtures';

function setupGhostApi() {
    const apiPath = 'members/api';
    const siteUrl = window.location.origin;

    function endpointFor({type, resource}) {
        if (type === 'members') {
            return `${siteUrl}/${apiPath}/${resource}/`;
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

        update({email, name, subscribed}) {
            const url = endpointFor({type: 'members', resource: 'member'});
            return makeRequest({
                url,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    email,
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

        sendMagicLink({email, emailType, labels, name}) {
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
        },

        signout() {
            const url = endpointFor({type: 'members', resource: 'session'});
            return makeRequest({
                url,
                method: 'DELETE'
            }).then(function (res) {
                if (res.ok) {
                    window.location.reload();
                    return 'Success';
                } else {
                    throw new Error('Failed to signout');
                }
            });
        },

        async checkoutPlan({plan, checkoutCancelUrl, checkoutSuccessUrl, email: customerEmail, name}) {
            const identity = await api.member.identity();
            const url = endpointFor({type: 'members', resource: 'create-stripe-checkout-session'});

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
                        name
                    },
                    successUrl: checkoutSuccessUrl,
                    cancelUrl: checkoutCancelUrl,
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

        async editBilling() {
            const identity = await api.member.identity();
            const url = endpointFor({type: 'members', resource: 'create-stripe-update-session'});

            return makeRequest({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: identity
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
        async updateSubscription({subscriptionId, planName}) {
            const identity = await api.member.identity();
            const url = endpointFor({type: 'members', resource: 'subscriptions'}) + subscriptionId + '/';
            return makeRequest({
                url,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: identity,
                    planName
                })
            });
        }
    };

    api.init = async () => {
        // Load member from fixtures for local development
        if (process.env.NODE_ENV === 'development') {
            return {site: Fixtures.site, member: Fixtures.member.free};
        }

        const {site} = await api.site.read();
        const member = await api.member.sessionData();

        return {site, member};
    };

    return api;
}

export default setupGhostApi;
