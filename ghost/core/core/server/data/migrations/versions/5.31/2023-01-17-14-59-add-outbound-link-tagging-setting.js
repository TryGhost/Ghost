const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'outbound_link_tagging',
    value: 'true',
    type: 'boolean',
    group: 'analytics'
});
