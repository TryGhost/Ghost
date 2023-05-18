const membersService = require('../../services/members');

module.exports = {
    docName: 'members_stripe_connect',
    auth: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: [
            'mode'
        ],
        validation: {
            options: {
                mode: {
                    values: ['live', 'test']
                }
            }
        },
        query(frame) {
            // This is something you have to do if you want to use the "framework" with access to the raw req/res
            frame.response = async function (req, res) {
                function setSessionProp(prop, val) {
                    req.session[prop] = val;
                }
                const mode = frame.options.mode || 'live';
                const stripeConnectAuthURL = await membersService.stripeConnect.getStripeConnectOAuthUrl(setSessionProp, mode);
                return res.redirect(stripeConnectAuthURL);
            };
        }
    }
};
