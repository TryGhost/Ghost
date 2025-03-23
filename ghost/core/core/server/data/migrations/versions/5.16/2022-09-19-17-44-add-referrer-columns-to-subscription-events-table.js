const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members_subscription_created_events', 'referrer_source', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),

    createAddColumnMigration('members_subscription_created_events', 'referrer_medium', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),

    createAddColumnMigration('members_subscription_created_events', 'referrer_url', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    })
);
