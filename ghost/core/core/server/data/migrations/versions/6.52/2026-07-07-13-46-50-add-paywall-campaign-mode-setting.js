const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'paywall_campaign_mode',
    value: 'false',
    type: 'boolean',
    group: 'members'
});
