const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'last_mentions_report_email_timestamp',
    value: null,
    type: 'number',
    group: 'core'
});
