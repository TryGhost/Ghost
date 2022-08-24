const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('users', 'free_member_signup_notification', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    }),

    createAddColumnMigration('users', 'paid_subscription_canceled_notification', {
        type: 'boolean',
        nullable: false,
        defaultTo: false
    }),

    createAddColumnMigration('users', 'paid_subscription_started_notification', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    })
);
