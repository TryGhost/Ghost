const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'member_welcome_emails_enabled',
    value: 'false',
    type: 'boolean',
    group: 'automations'
});