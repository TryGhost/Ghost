const {addSetting} = require('../../utils.js');

module.exports = addSetting({
    key: 'default_content_visibility_tiers',
    value: '[]',
    type: 'array',
    group: 'members'
});
