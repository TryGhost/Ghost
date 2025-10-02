const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    // members_created_events
    createAddColumnMigration('members_created_events', 'utm_source', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_created_events', 'utm_medium', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_created_events', 'utm_campaign', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_created_events', 'utm_term', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_created_events', 'utm_content', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),

    // members_subscription_created_events
    createAddColumnMigration('members_subscription_created_events', 'utm_source', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_subscription_created_events', 'utm_medium', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_subscription_created_events', 'utm_campaign', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_subscription_created_events', 'utm_term', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('members_subscription_created_events', 'utm_content', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),

    // donation_payment_events
    createAddColumnMigration('donation_payment_events', 'utm_source', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('donation_payment_events', 'utm_medium', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('donation_payment_events', 'utm_campaign', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('donation_payment_events', 'utm_term', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'}),
    createAddColumnMigration('donation_payment_events', 'utm_content', {type: 'string', maxlength: 191, nullable: true, algorithm: 'inplace'})
);