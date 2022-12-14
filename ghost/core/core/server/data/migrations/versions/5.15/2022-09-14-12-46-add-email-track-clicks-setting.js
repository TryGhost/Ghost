const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'email_track_clicks',
    value: 'true',
    type: 'boolean',
    group: 'email'
});
