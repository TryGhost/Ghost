const membersService = require('../../services/members');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const {BadRequestError} = require('@tryghost/errors');

module.exports = {
    docName: 'members_stripe_connect',
    auth: {
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
            const siteUrl = urlUtils.getSiteUrl();
            const productionMode = config.get('env') === 'production';
            const siteUrlUsingSSL = /^https/.test(siteUrl);
            const cannotConnectToStripe = productionMode && !siteUrlUsingSSL;
            if (cannotConnectToStripe) {
                throw new BadRequestError('Cannot connect to stripe unless site is using https://');
            }
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
