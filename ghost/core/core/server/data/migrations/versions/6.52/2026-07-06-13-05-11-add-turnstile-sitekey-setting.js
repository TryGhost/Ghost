const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'turnstile_sitekey',
    value: null,
    type: 'string',
    group: 'members'
});
