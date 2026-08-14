const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('automated_email_recipients', 'mailgun_message_id', {
        type: 'string',
        // [Mailgun IDs][0] are [RFC 2392 Message-IDs][1]. [RFC 5322][2] caps
        // message lines at 998 chars, or 1000 including CRLF. In practice,
        // Mailgun IDs are much shorter, but let's give ourselves room.
        // [0]: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages
        // [1]: https://datatracker.ietf.org/doc/html/rfc2392#section-2
        // [2]: https://datatracker.ietf.org/doc/html/rfc5322#section-2.1.1
        maxlength: 1000,
        nullable: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automated_email_recipients', 'delivered_at', {
        type: 'dateTime',
        nullable: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automated_email_recipients', 'opened_at', {
        type: 'dateTime',
        nullable: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automated_email_recipients', 'track_opens', {
        type: 'boolean',
        nullable: false,
        defaultTo: false
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automation_action_revisions', 'email_sent_count', {
        type: 'integer',
        nullable: true,
        unsigned: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automation_action_revisions', 'email_tracked_sent_count', {
        type: 'integer',
        nullable: true,
        unsigned: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automation_action_revisions', 'email_opened_count', {
        type: 'integer',
        nullable: true,
        unsigned: true
    }, {algorithm: 'auto'})
);
