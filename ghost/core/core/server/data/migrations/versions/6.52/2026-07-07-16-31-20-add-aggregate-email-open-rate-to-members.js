const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'aggregate_email_open_rate', {
    type: 'integer',
    unsigned: true,
    nullable: true,
    index: true,
    generatedAlwaysAs: 'case when coalesce(newsletter_tracked_email_count, 0) + automation_tracked_email_count >= 5 then round((newsletter_email_open_count + automation_email_open_count) * 100.0 / (coalesce(newsletter_tracked_email_count, 0) + automation_tracked_email_count)) else null end'
}, {algorithm: 'instant'});
