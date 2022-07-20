const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'default_content_visibility_tiers',
    value: '[]',
    type: 'array',
    group: 'members'
});
