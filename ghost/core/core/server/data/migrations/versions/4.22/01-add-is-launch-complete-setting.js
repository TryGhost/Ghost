const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'editor_is_launch_complete',
    value: 'false',
    type: 'boolean',
    group: 'editor'
});
