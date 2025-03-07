const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'captcha_enabled',
    value: 'false',
    type: 'boolean',
    group: 'members'
});
