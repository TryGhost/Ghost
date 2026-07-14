const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'ai_anthropic_api_key',
    value: null,
    type: 'string',
    group: 'ai'
});
