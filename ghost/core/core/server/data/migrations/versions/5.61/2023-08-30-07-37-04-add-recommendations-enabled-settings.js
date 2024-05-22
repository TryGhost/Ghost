const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'recommendations_enabled',
    value: 'false',
    type: 'boolean',
    group: 'recommendations'
});
