const {addPermission} = require('../../utils');

module.exports = addPermission({
    name: 'Auth Stripe Connect for Members',
    action: 'auth',
    object: 'members_stripe_connect'
});
