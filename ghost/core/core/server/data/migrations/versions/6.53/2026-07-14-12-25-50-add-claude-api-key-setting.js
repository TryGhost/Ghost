const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'claude_api_key',
    value: null,
    type: 'string',
    group: 'claude'
});
