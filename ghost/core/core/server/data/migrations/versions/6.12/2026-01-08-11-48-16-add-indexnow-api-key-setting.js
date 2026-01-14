const crypto = require('crypto');
const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'indexnow_api_key',
    value: crypto.randomBytes(16).toString('hex'),
    type: 'string',
    group: 'indexnow'
});
