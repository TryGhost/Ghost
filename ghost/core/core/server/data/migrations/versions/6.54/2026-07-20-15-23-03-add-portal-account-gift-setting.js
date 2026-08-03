const {addSetting} = require('../../utils');

// Whether paid members see the gift entry point on their account page.
// Per-surface companion to portal_gift (the signup page link) — there is no
// global gift on/off switch; gifting is available whenever paid membership is.
module.exports = addSetting({
    key: 'portal_account_gift',
    value: 'true',
    type: 'boolean',
    group: 'portal'
});
