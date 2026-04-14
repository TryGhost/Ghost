const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'llms_enabled',
    value: true,
    type: 'boolean',
    group: 'site'
});
