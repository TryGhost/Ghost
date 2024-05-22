const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'portal_default_plan',
    value: 'yearly',
    type: 'string',
    group: 'portal'
});
