const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'require_email_mfa',
    value: 'false',
    type: 'boolean',
    group: 'security'
});
