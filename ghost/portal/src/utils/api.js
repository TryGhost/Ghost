function setupGhostApi({adminUrl}) {
    const ghostPath = 'ghost';
    const ssrPath = 'members/ssr';
    const version = 'v3';
    adminUrl = adminUrl.replace(/\/$/, '');
    let siteUrl = window.location.origin;

    function endpointFor({type, resource}) {
        if (type === 'members') {
            return `${adminUrl}/${ghostPath}/api/${version}/members/${resource}/`;
        } else if (type === 'admin') {
            return `${adminUrl}/${ghostPath}/api/${version}/admin/${resource}/`;
        } else if (type === 'ssr') {
            return resource ? `${siteUrl}/${ssrPath}/${resource}/` : `${siteUrl}/${ssrPath}/`;
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
            const url = endpointFor({type: 'admin', resource: 'site'});
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
            const url = endpointFor({type: 'ssr'});
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
            const url = endpointFor({type: 'ssr', resource: 'member'});
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

        sendMagicLink({email, emailType, labels}) {
            const url = endpointFor({type: 'members', resource: 'send-magic-link'});
            return makeRequest({
                url,
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
        },

        signout() {
            const url = endpointFor({type: 'ssr'});
            return makeRequest({
                url,
                method: 'DELETE'
            }).then(function (res) {
                if (res.ok) {
                    window.location.reload();
                    return 'Success';
                } else {
                    console.log('Failed to signout!', res);
                }
            });
        },

        async checkoutPlan({plan, checkoutCancelUrl, checkoutSuccessUrl}) {
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
                    successUrl: checkoutSuccessUrl,
                    cancelUrl: checkoutCancelUrl
                })
            }).then(function (res) {
                if (!res.ok) {
                    throw new Error('Could not create stripe checkout session');
                }
                return res.json();
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
        }
    };

    api.init = async () => {
        const {site} = await api.site.read();
        // Update site url from site data instead of default window.location.origin
        siteUrl = site.url.replace(/\/$/, '');
        const member = await api.member.sessionData();
        return {site, member};
    };

    return api;
}

export default setupGhostApi;
