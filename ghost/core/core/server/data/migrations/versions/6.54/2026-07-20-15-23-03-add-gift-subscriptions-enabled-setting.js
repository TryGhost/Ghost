const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'gift_subscriptions_enabled',
    value: 'true',
    type: 'boolean',
    group: 'members'
});
