const membersService = require('../../services/members');

module.exports = {
    docName: 'members_stripe_connect',
    auth: {
        permissions: true,
        query(frame) {
            // This is something you have to do if you want to use the "framework" with access to the raw req/res
            frame.response = async function (req, res) {
                function setSessionProp(prop, val) {
                    req.session[prop] = val;
                }
                const stripeConnectAuthURL = await membersService.stripeConnect.getStripeConnectOAuthUrl(setSessionProp);
                return res.redirect(stripeConnectAuthURL);
            };
        }
    }
};
