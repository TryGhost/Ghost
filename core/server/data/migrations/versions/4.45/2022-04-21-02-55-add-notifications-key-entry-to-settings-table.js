const {addSetting} = require('../../utils.js');

module.exports = addSetting({
    key: 'version_notifications',
    value: '[]',
    type: 'array',
    group: 'core'
});
