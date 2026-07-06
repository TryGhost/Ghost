const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'turnstile_secret_key',
    value: null,
    type: 'string',
    group: 'members'
});
