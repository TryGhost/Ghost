const {addSetting} = require('../../utils.js');

module.exports = addSetting({
    key: 'editor_is_launch_complete',
    value: 'false',
    type: 'boolean',
    group: 'editor'
});
