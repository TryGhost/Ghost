const {addSetting} = require('../../utils');
const crypto = require('crypto');

module.exports = addSetting({
    key: 'members_otc_secret',
    value: crypto.randomBytes(64).toString('hex'),
    type: 'string',
    group: 'core'
});