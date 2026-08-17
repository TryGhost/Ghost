const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('automated_email_recipients', 'track_clicks', {
        type: 'boolean',
        nullable: false,
        defaultTo: false
    }, {algorithm: 'auto'}),
    createAddColumnMigration('automated_email_recipients', 'clicked_at', {
        type: 'dateTime',
        nullable: true
    }, {algorithm: 'auto'})
);
