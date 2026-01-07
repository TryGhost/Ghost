const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'web_analytics',
    value: 'true',
    type: 'boolean',
    group: 'analytics'
});