const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'blocked_email_domains',
    value: '[]',
    type: 'array',
    group: 'members'
});
