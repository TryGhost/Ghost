const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'recommendations_enabled',
    value: 'true',
    type: 'boolean',
    group: 'recommendations'
});
