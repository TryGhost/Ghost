const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'comments_enabled',
    value: 'off',
    type: 'string',
    group: 'comments'
});
