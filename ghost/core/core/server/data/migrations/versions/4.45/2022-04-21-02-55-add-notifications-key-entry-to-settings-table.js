const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'version_notifications',
    value: '[]',
    type: 'array',
    group: 'core'
});
